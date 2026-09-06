document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = './api'; // Use local api folder for PHP scripts

    // Set current year in footer
    const currentYearEl = document.getElementById('current-year');
    if (currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }

    // Valid promo codes (for early bird only)
    const validPromoCodes = ['SYN26'];

    // Initialize intl-tel-input for phone fields
    const itiConfig = {
        initialCountry: "pk",
        preferredCountries: ["pk", "ae", "sa", "gb"],
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
    };

    let userPhoneIti = null;
    let contactPhoneIti = null;

    const userPhoneInput = document.querySelector("#user-phone");
    if (userPhoneInput) {
        userPhoneIti = window.intlTelInput(userPhoneInput, itiConfig);
        userPhoneInput.addEventListener('blur', () => {
            const errorSpan = document.querySelector("#user-phone-error");
            if (userPhoneInput.value.trim() && !userPhoneIti.isValidNumber()) {
                errorSpan.textContent = "Invalid phone number.";
                errorSpan.classList.add('show');
            } else {
                errorSpan.classList.remove('show');
            }
        });
        userPhoneInput.addEventListener('input', () => document.querySelector("#user-phone-error").classList.remove('show'));
    }

    const contactPhoneInput = document.querySelector("#contact-phone");
    if (contactPhoneInput) {
        contactPhoneIti = window.intlTelInput(contactPhoneInput, itiConfig);
        contactPhoneInput.addEventListener('blur', () => {
            const errorSpan = document.querySelector("#contact-phone-error");
            if (contactPhoneInput.value.trim() && !contactPhoneIti.isValidNumber()) {
                errorSpan.textContent = "Invalid phone number.";
                errorSpan.classList.add('show');
            } else {
                errorSpan.classList.remove('show');
            }
        });
        contactPhoneInput.addEventListener('input', () => document.querySelector("#contact-phone-error").classList.remove('show'));
    }

    // Email Validation Regex and input listeners
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    const userEmailInput = document.querySelector("#user-email");
    if (userEmailInput) {
        userEmailInput.addEventListener('input', () => {
            const err = document.querySelector("#user-email-error");
            if (err) err.classList.remove('show');
        });
    }

    const contactEmailInput = document.querySelector("#contact-email");
    if (contactEmailInput) {
        contactEmailInput.addEventListener('input', () => {
            const err = document.querySelector("#contact-email-error");
            if (err) err.classList.remove('show');
        });
    }

    // Package Modal Logic
    const packageModal = document.getElementById('package-modal');
    const packageModalClose = document.getElementById('package-modal-close');
    const packageTitleEl = document.getElementById('modal-package-title');
    const subjectLimitEl = document.getElementById('subject-limit');
    const maxSubjectsEl = document.getElementById('max-subjects');
    const selectedCountEl = document.getElementById('selected-count');
    const totalPriceEl = document.getElementById('total-price');
    const priceNoteEl = document.getElementById('price-note');
    const promoGroup = document.getElementById('promo-group');
    const promoCodeInput = document.getElementById('promo-code');
    const applyPromoBtn = document.getElementById('apply-promo');
    const promoMessage = document.getElementById('promo-message');
    const packageSubmitBtn = document.getElementById('package-submit-btn');
    const packageForm = document.getElementById('package-form');
    const packageFormResult = document.getElementById('package-form-result');
    const subjectCheckboxes = document.querySelectorAll('.subject-checkbox');

    let currentPackage = null;
    let maxSubjects = 0;
    let packagePrice = 0;
    let isEarlyBird = false;
    let promoApplied = false;

    // Package names mapping
    const packageNames = {
        'solo': 'THE SOLO',
        'associate': 'THE ASSOCIATE',
        'trinity': 'THE TRINITY',
        'executive': 'THE EXECUTIVE',
        'monopoly': 'THE MONOPOLY',
        'early-bird': 'EARLY BIRD'
    };

    // Open modal when clicking select package buttons
    document.querySelectorAll('.select-btn[data-package], .cta-button[data-package]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            currentPackage = btn.dataset.package;
            maxSubjects = parseInt(btn.dataset.subjects);
            packagePrice = parseInt(btn.dataset.price);
            isEarlyBird = currentPackage === 'early-bird';

            // Reset modal state
            resetModal();

            // Update modal title and limits
            packageTitleEl.textContent = packageNames[currentPackage];
            subjectLimitEl.textContent = isEarlyBird ? `up to ${maxSubjects}` : maxSubjects;
            maxSubjectsEl.textContent = maxSubjects;

            // Show/hide promo code field (only for early bird)
            if (isEarlyBird) {
                promoGroup.classList.remove('hidden');
            } else {
                promoGroup.classList.add('hidden');
            }

            // Show modal
            packageModal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';

            updatePrice();
        });
    });

    // Reset modal to initial state
    function resetModal() {
        // Uncheck all subjects
        subjectCheckboxes.forEach(label => {
            const checkbox = label.querySelector('input[type="checkbox"]');
            checkbox.checked = false;
            label.classList.remove('selected', 'disabled');
        });

        // Reset form
        packageForm.reset();
        
        // Hide and reset 'other' level input
        const otherLevelGroup = document.getElementById('other-level-group');
        const otherLevelInput = document.getElementById('other-level');
        if (otherLevelGroup) {
            otherLevelGroup.classList.add('hidden');
            if (otherLevelInput) {
                otherLevelInput.required = false;
                otherLevelInput.value = '';
            }
        }
        
        promoApplied = false;
        promoMessage.textContent = '';
        promoMessage.className = 'promo-message';
        packageFormResult.innerHTML = '';
        selectedCountEl.textContent = '0';
        packageSubmitBtn.disabled = true;
    }

    // Close modal
    function closePackageModal() {
        packageModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    if (packageModalClose) {
        packageModalClose.addEventListener('click', closePackageModal);
    }

    if (packageModal) {
        packageModal.addEventListener('click', (e) => {
            if (e.target === packageModal) {
                closePackageModal();
            }
        });
    }

    // Handle subject selection
    subjectCheckboxes.forEach(label => {
        const checkbox = label.querySelector('input[type="checkbox"]');

        label.addEventListener('click', (e) => {
            if (label.classList.contains('disabled') && !checkbox.checked) {
                e.preventDefault();
                return;
            }

            // Toggle checkbox
            checkbox.checked = !checkbox.checked;
            label.classList.toggle('selected', checkbox.checked);

            updateSubjectSelection();
            updatePrice();
        });
    });

    // Update subject selection state
    function updateSubjectSelection() {
        const checkedCount = document.querySelectorAll('.subject-checkbox input:checked').length;
        selectedCountEl.textContent = checkedCount;

        // For early bird, allow any number up to maxSubjects
        // For other packages, enforce exact limit
        if (isEarlyBird) {
            // Enable/disable subjects based on max limit
            subjectCheckboxes.forEach(label => {
                const checkbox = label.querySelector('input[type="checkbox"]');
                if (checkedCount >= maxSubjects && !checkbox.checked) {
                    label.classList.add('disabled');
                } else {
                    label.classList.remove('disabled');
                }
            });

            // Show/hide promo code field based on subject count
            if (checkedCount === 5) {
                promoGroup.classList.add('hidden');
            } else {
                promoGroup.classList.remove('hidden');
            }
        } else {
            // For regular packages, disable unchecked when limit reached
            subjectCheckboxes.forEach(label => {
                const checkbox = label.querySelector('input[type="checkbox"]');
                if (checkedCount >= maxSubjects && !checkbox.checked) {
                    label.classList.add('disabled');
                } else {
                    label.classList.remove('disabled');
                }
            });
        }

        // Enable submit button based on selection
        validateForm();
    }

    // Update price display
    function updatePrice() {
        const checkedCount = document.querySelectorAll('.subject-checkbox input:checked').length;

        if (isEarlyBird) {
            // Early bird: price per subject, or flat Rs. 24,000 for 5 subjects
            let totalPrice;
            if (checkedCount === 5) {
                totalPrice = 24000;
            } else {
                const basePrice = packagePrice;
                const discount = 500;
                const pricePerSubject = promoApplied ? (basePrice - discount) : basePrice;
                totalPrice = checkedCount * pricePerSubject;
            }
            totalPriceEl.textContent = `Rs. ${totalPrice.toLocaleString()}`;

            if (checkedCount === 5) {
                priceNoteEl.textContent = `5 subject(s) × Rs. 4,800 (Special Package Price!)`;
                priceNoteEl.className = 'price-note';
            } else {
                const basePrice = packagePrice;
                const discount = 500;
                const pricePerSubject = promoApplied ? (basePrice - discount) : basePrice;
                if (promoApplied) {
                    priceNoteEl.textContent = `${checkedCount} subject(s) × Rs. ${pricePerSubject.toLocaleString()} (Promo Applied!)`;
                    priceNoteEl.className = 'price-note discount';
                } else {
                    priceNoteEl.textContent = `${checkedCount} subject(s) × Rs. ${pricePerSubject.toLocaleString()}`;
                    priceNoteEl.className = 'price-note';
                }
            }
        } else {
            // Regular packages: fixed price
            totalPriceEl.textContent = `Rs. ${packagePrice.toLocaleString()}`;
            priceNoteEl.textContent = `${maxSubjects} subjects included`;
            priceNoteEl.className = 'price-note';
        }
    }

    // Validate form
    function validateForm() {
        const checkedCount = document.querySelectorAll('.subject-checkbox input:checked').length;
        const name = document.getElementById('user-name').value.trim();
        const email = document.getElementById('user-email').value.trim();
        const phone = document.getElementById('user-phone').value.trim();
        const levelDropdown = document.getElementById('user-level');
        const level = levelDropdown ? levelDropdown.value : '';
        const otherLevel = document.getElementById('other-level') ? document.getElementById('other-level').value.trim() : '';
        
        const isLevelValid = level === 'Other' ? otherLevel !== '' : level !== '';

        let isValid = false;

        if (isEarlyBird) {
            // For early bird, at least 1 subject required
            isValid = checkedCount >= 1 && name && email && phone && isLevelValid;
        } else {
            // For regular packages, exact number of subjects required
            isValid = checkedCount === maxSubjects && name && email && phone && isLevelValid;
        }

        packageSubmitBtn.disabled = !isValid;
    }

    // Add input listeners for form validation
    ['user-name', 'user-email', 'user-phone', 'user-level', 'other-level'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', validateForm);
        }
    });

    // Handle level dropdown change to show/hide other level input
    const userLevelDropdown = document.getElementById('user-level');
    const otherLevelGroup = document.getElementById('other-level-group');
    const otherLevelInput = document.getElementById('other-level');

    if (userLevelDropdown && otherLevelGroup && otherLevelInput) {
        userLevelDropdown.addEventListener('change', (e) => {
            if (e.target.value === 'Other') {
                otherLevelGroup.classList.remove('hidden');
                otherLevelInput.required = true;
            } else {
                otherLevelGroup.classList.add('hidden');
                otherLevelInput.required = false;
                otherLevelInput.value = '';
            }
            validateForm();
        });
    }

    // Apply promo code
    if (applyPromoBtn) {
        applyPromoBtn.addEventListener('click', () => {
            const code = promoCodeInput.value.trim().toUpperCase();

            if (validPromoCodes.includes(code)) {
                promoApplied = true;
                promoMessage.textContent = ''; // Removed success message per user request
                promoMessage.className = 'promo-message success';
                applyPromoBtn.textContent = 'Applied';
                applyPromoBtn.disabled = true;
                promoCodeInput.disabled = true;
            } else {
                promoApplied = false;
                promoMessage.textContent = 'Invalid promo code. Please try again.';
                promoMessage.className = 'promo-message error';
            }

            updatePrice();
        });
    }

    // Handle form submission
    if (packageForm) {
        let currentPackageFormData = null; // Store formData during OTP flow
        let currentOtpToken = ''; // Store HMAC token returned from request-otp.php

        packageForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('user-name').value.trim();
            const email = document.getElementById('user-email').value.trim();
            
            if (!emailRegex.test(email)) {
                const errorSpan = document.querySelector("#user-email-error");
                if (errorSpan) {
                    errorSpan.textContent = "Invalid email format.";
                    errorSpan.classList.add('show');
                }
                return;
            }
            
            if (userPhoneIti && !userPhoneIti.isValidNumber()) {
                const errorSpan = document.querySelector("#user-phone-error");
                if (errorSpan) {
                    errorSpan.textContent = "Invalid phone number.";
                    errorSpan.classList.add('show');
                }
                return;
            }
            const phone = userPhoneIti ? userPhoneIti.getNumber() : document.getElementById('user-phone').value.trim();
            
            const levelDropdown = document.getElementById('user-level');
            const otherLevelInput = document.getElementById('other-level');
            let academicLevel = '';
            if (levelDropdown) {
                if (levelDropdown.value === 'Other') {
                    academicLevel = otherLevelInput ? otherLevelInput.value.trim() : 'Other';
                } else {
                    academicLevel = levelDropdown.value;
                }
            }
            
            const promoCode = promoCodeInput ? promoCodeInput.value.trim() : '';

            // Get selected subjects
            const selectedSubjects = [];
            document.querySelectorAll('.subject-checkbox input:checked').forEach(checkbox => {
                selectedSubjects.push(checkbox.value);
            });

            // Calculate final price
            let finalPrice = 0;
            if (isEarlyBird) {
                if (selectedSubjects.length === 5) {
                    finalPrice = 24000;
                } else {
                    const basePrice = packagePrice;
                    const discount = 500;
                    const pricePerSubject = promoApplied ? (basePrice - discount) : basePrice;
                    finalPrice = selectedSubjects.length * pricePerSubject;
                }
            } else {
                finalPrice = packagePrice;
            }

            // Prepare form data for Web3Forms (to be sent by backend or frontend later)
            const web3Data = {
                access_key: 'b394ec4c-4e46-4390-bd05-eee6b324f902',
                subject: `New Package Enrollment - ${packageNames[currentPackage]}`,
                name: name,
                email: email,
                phone: phone,
                academic_level: academicLevel,
                package: packageNames[currentPackage],
                selected_subjects: selectedSubjects.join(', '),
                total_price: `Rs. ${finalPrice.toLocaleString()}`
            };
            if (promoCode && promoApplied && selectedSubjects.length < 5) {
                web3Data.promo_code = promoCode;
            }

            // Submit to Web3Forms directly
            packageSubmitBtn.textContent = 'Submitting...';
            packageSubmitBtn.disabled = true;

            fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(web3Data)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    packageFormResult.innerHTML = '<p class="success-message">Enrollment submitted successfully! We\'ll contact you soon.</p>';
                    setTimeout(() => {
                        closePackageModal();
                    }, 3000);
                } else {
                    packageFormResult.innerHTML = `<p class="error-message">${data.message || 'Error submitting enrollment.'}</p>`;
                    packageSubmitBtn.textContent = 'Submit Enrollment';
                    packageSubmitBtn.disabled = false;
                }
            })
            .catch(err => {
                packageFormResult.innerHTML = '<p class="error-message">Oops! Something went wrong communicating with the server.</p>';
                packageSubmitBtn.textContent = 'Submit Enrollment';
                packageSubmitBtn.disabled = false;
            });
        });
    }


    // Welcome Modal Logic
    const modal = document.getElementById('welcome-modal');
    const modalClose = document.getElementById('modal-close');

    if (modal && modalClose) {
        // If not shown in this session yet, show it and prevent body scrolling
        if (sessionStorage.getItem('welcomeModalShown') !== 'true') {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        function closeModal() {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
            sessionStorage.setItem('welcomeModalShown', 'true');
        }

        modalClose.addEventListener('click', closeModal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    // Smooth scrolling for anchor links (accounting for fixed navbar)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const navbarHeight = 70;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu after clicking
                if (navLinks.classList.contains('mobile-active')) {
                    navLinks.classList.remove('mobile-active');
                }
            }
        });
    });

    // Mobile Menu Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-active');
        });
    }

    // Web3Forms Contact Form
    const form = document.getElementById('contact-form');
    const result = document.getElementById('form-result');

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(form);
            const submitBtn = form.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;

            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;

            fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        result.innerHTML = '<p class="success-message">Message sent successfully! We\'ll get back to you soon.</p>';
                        form.reset();
                    } else {
                        result.innerHTML = '<p class="error-message">Oops! Something went wrong. Please try again.</p>';
                    }
                })
                .catch(error => {
                    result.innerHTML = '<p class="error-message">Oops! Something went wrong. Please try again.</p>';
                })
                .finally(() => {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    setTimeout(() => {
                        result.innerHTML = '';
                    }, 5000);
                });
        });
    }

    // ==========================================
    // CORE SUBJECTS CARD SLIDER SYSTEM
    // ==========================================
    const subjectWrapper = document.getElementById('subject-slider-wrapper');
    const subjectContainer = document.getElementById('subject-slider-container');

    if (subjectWrapper && subjectContainer) {
        let currentIndex = 0;
        const totalSlides = subjectContainer.querySelectorAll('.subject-slide').length;

        function updateSlide(index) {
            currentIndex = index;
            // Shift the slider track horizontally
            subjectWrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
        }

        // Laptop/Desktop Navigation Button Click Bindings
        const prevBtn = document.getElementById('subject-prev-btn');
        const nextBtn = document.getElementById('subject-next-btn');

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                let prevIndex = (currentIndex - 1 + totalSlides) % totalSlides;
                updateSlide(prevIndex);
            });

            nextBtn.addEventListener('click', () => {
                let nextIndex = (currentIndex + 1) % totalSlides;
                updateSlide(nextIndex);
            });
        }

        // Touch Swipe Gesture Support
        let startX = 0;
        let diffX = 0;

        subjectContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });

        subjectContainer.addEventListener('touchmove', (e) => {
            diffX = startX - e.touches[0].clientX;
        }, { passive: true });

        subjectContainer.addEventListener('touchend', () => {
            // Check if horizontal swipe drag is over 50px threshold
            if (Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    // Swiped left -> show next subject
                    let nextIndex = (currentIndex + 1) % totalSlides;
                    updateSlide(nextIndex);
                } else {
                    // Swiped right -> show previous subject
                    let prevIndex = (currentIndex - 1 + totalSlides) % totalSlides;
                    updateSlide(prevIndex);
                }
            }
            // Reset diffX
            diffX = 0;
        });
    }

    // ==========================================
    // TESTIMONIALS CARD SLIDER SYSTEM
    // ==========================================
    const testimonialWrapper = document.getElementById('testimonial-slider-wrapper');
    const testimonialContainer = document.getElementById('testimonial-slider-container');

    if (testimonialWrapper && testimonialContainer) {
        let currentIndex = 0;
        const totalSlides = testimonialContainer.querySelectorAll('.testimonial-slide').length;

        function updateTestimonialSlide(index) {
            currentIndex = index;
            testimonialWrapper.style.transform = `translateX(-${currentIndex * 100}%)`;
        }

        const prevBtn = document.getElementById('testimonial-prev-btn');
        const nextBtn = document.getElementById('testimonial-next-btn');

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                let prevIndex = (currentIndex - 1 + totalSlides) % totalSlides;
                updateTestimonialSlide(prevIndex);
            });

            nextBtn.addEventListener('click', () => {
                let nextIndex = (currentIndex + 1) % totalSlides;
                updateTestimonialSlide(nextIndex);
            });
        }

        // Touch Swipe Gesture Support
        let startX = 0;
        let diffX = 0;

        testimonialContainer.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });

        testimonialContainer.addEventListener('touchmove', (e) => {
            diffX = startX - e.touches[0].clientX;
        }, { passive: true });

        testimonialContainer.addEventListener('touchend', () => {
            if (Math.abs(diffX) > 50) {
                if (diffX > 0) {
                    let nextIndex = (currentIndex + 1) % totalSlides;
                    updateTestimonialSlide(nextIndex);
                } else {
                    let prevIndex = (currentIndex - 1 + totalSlides) % totalSlides;
                    updateTestimonialSlide(prevIndex);
                }
            }
            diffX = 0;
        });
    }
});
