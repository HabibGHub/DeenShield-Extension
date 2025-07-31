document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const settingsView = document.getElementById('settings-view');
    const lockedView = document.getElementById('locked-view');
    const recoveryView = document.getElementById('recovery-view');
    const blockHaramToggle = document.getElementById('blockHaram');
    const blockSocialToggle = document.getElementById('blockSocial');
    const keywordInput = document.getElementById('keywordInput');
    const addKeywordBtn = document.getElementById('addKeywordBtn');
    const keywordList = document.getElementById('keywordList');
    const passwordInput = document.getElementById('passwordInput');
    const setPasswordBtn = document.getElementById('setPasswordBtn');
    const unlockPasswordInput = document.getElementById('unlockPasswordInput');
    const unlockBtn = document.getElementById('unlockBtn');
    
    // Donate button elements
    const donateBtn = document.getElementById('donateBtn');
    const donateBtnLocked = document.getElementById('donateBtnLocked');

    // Security Questions Elements
    const securityQuestionsDiv = document.getElementById('security-questions');
    const toggleSecurityBtn = document.getElementById('toggleSecurityBtn');
    const securityQuestion = document.getElementById('securityQuestion');
    const securityAnswer = document.getElementById('securityAnswer');
    const saveSecurityBtn = document.getElementById('saveSecurityBtn');

    // Recovery Elements
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const securityRecovery = document.getElementById('security-recovery');
    const recoveryQuestion = document.getElementById('recoveryQuestion');
    const recoveryAnswer = document.getElementById('recoveryAnswer');
    const verifyAnswerBtn = document.getElementById('verifyAnswerBtn');
    const newPasswordSection = document.getElementById('new-password-section');
    const newPasswordInput = document.getElementById('newPasswordInput');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');
    const emergencyResetBtn = document.getElementById('emergencyResetBtn');
    const backToLoginBtn = document.getElementById('backToLoginBtn');

    let customKeywords = [];
        let haramKeywords = [];
        let socialDomains = [];

    // --- Load settings from storage ---
    browser.storage.sync.get(['settings'], (result) => {
        const settings = result.settings || {};
        
        // Show appropriate view
        if (settings.password) {
            settingsView.style.display = 'none';
            lockedView.style.display = 'block';
            recoveryView.style.display = 'none';
        } else {
            settingsView.style.display = 'block';
            lockedView.style.display = 'none';
            recoveryView.style.display = 'none';
        }

        // Show security question setup if password is set but no security question
        if (settings.password && !settings.securityQuestion && toggleSecurityBtn) {
            toggleSecurityBtn.style.display = 'inline-block';
        }

        blockHaramToggle.checked = settings.blockHaram !== false;
        blockSocialToggle.checked = settings.blockSocial === true;
        customKeywords = settings.customKeywords || [];
            haramKeywords = settings.haramKeywords || [
                'porn', 'sex', 'xxx', 'adult', 'erotic', 'naked', 'lust', 'lewd',
                'betting', 'casino', 'gambling', 'poker', 'roulette', 'slots',
                'liquor', 'vodka', 'whiskey', 'beer', 'wine', 'alcohol',
                'interest', 'riba', 'idol', 'statue', 'astrology', 'horoscope', 'pagan'
            ];
            socialDomains = settings.socialDomains || [
                'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'youtube.com',
                'reddit.com', 'pinterest.com', 'linkedin.com', 'snapchat.com', 'discord.com'
            ];
        renderKeywords();
    });

    // --- Event Listeners ---
    blockHaramToggle.addEventListener('change', () => saveSetting('blockHaram', blockHaramToggle.checked));
    blockSocialToggle.addEventListener('change', () => saveSetting('blockSocial', blockSocialToggle.checked));

    addKeywordBtn.addEventListener('click', addKeyword);
    keywordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addKeyword();
    });
        const haramInput = document.getElementById('haramInput');
        const addHaramBtn = document.getElementById('addHaramBtn');
        const haramList = document.getElementById('haramList');
        const socialInput = document.getElementById('socialInput');
        const addSocialBtn = document.getElementById('addSocialBtn');
        const socialList = document.getElementById('socialList');
    
        addHaramBtn.addEventListener('click', addHaramKeyword);
        haramInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addHaramKeyword();
        });
    
        addSocialBtn.addEventListener('click', addSocialDomain);
        socialInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addSocialDomain();
        });

    // Password Setting
    setPasswordBtn.addEventListener('click', () => {
        const pass = passwordInput.value;
        if (pass) {
            if (pass.length < 4) {
                showMessage('Password should be at least 4 characters long.', 'warning');
                return;
            }
            
            saveSetting('password', pass);
            showMessage('Password set successfully! Bismillah.', 'success');
            passwordInput.value = '';
            settingsView.style.display = 'none';
            lockedView.style.display = 'block';
            
            // Show security question setup option
            if (toggleSecurityBtn) {
                toggleSecurityBtn.style.display = 'inline-block';
            }
        }
    });

    // Security Questions Setup
    if (toggleSecurityBtn) {
        toggleSecurityBtn.addEventListener('click', () => {
            securityQuestionsDiv.style.display = securityQuestionsDiv.style.display === 'none' ? 'block' : 'none';
        });
    }

    if (saveSecurityBtn) {
        saveSecurityBtn.addEventListener('click', () => {
            const question = securityQuestion.value;
            const answer = securityAnswer.value.trim();
            
            if (!question || !answer) {
                showMessage('Please select a question and provide an answer.', 'warning');
                return;
            }
            
            saveSetting('securityQuestion', question);
            saveSetting('securityAnswer', answer);
            showMessage('Security question saved successfully! This will help with password recovery.', 'success');
            securityQuestionsDiv.style.display = 'none';
            toggleSecurityBtn.style.display = 'none';
            securityAnswer.value = '';
        });
    }

    // Password Unlock
    unlockBtn.addEventListener('click', () => {
        browser.storage.sync.get(['settings'], (result) => {
            const savedPassword = result.settings.password;
            if (unlockPasswordInput.value === savedPassword) {
                settingsView.style.display = 'block';
                lockedView.style.display = 'none';
                recoveryView.style.display = 'none';
                unlockPasswordInput.value = '';
                showMessage('Welcome back! Alhamdulillah.', 'success');
            } else {
                showMessage('Incorrect password. Try again or use forgot password.', 'error');
                unlockPasswordInput.value = '';
            }
        });
    });

    // Forgot Password
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', () => {
            browser.storage.sync.get(['settings'], (result) => {
                const settings = result.settings || {};
                
                settingsView.style.display = 'none';
                lockedView.style.display = 'none';
                recoveryView.style.display = 'block';
                
                if (settings.securityQuestion && settings.securityAnswer) {
                    securityRecovery.style.display = 'block';
                    const questions = {
                        'mother': 'What is your mother\'s maiden name?',
                        'birthplace': 'What city were you born in?',
                        'school': 'What was the name of your first school?',
                        'pet': 'What was your first pet\'s name?',
                        'book': 'What is your favorite Islamic book?',
                        'masjid': 'What is the name of your local masjid?',
                        'teacher': 'Who was your favorite teacher?'
                    };
                    recoveryQuestion.textContent = questions[settings.securityQuestion] || 'Security Question';
                } else {
                    securityRecovery.style.display = 'none';
                    showMessage('No security question set. Please use emergency reset.', 'info');
                }
            });
        });
    }

    // Verify Security Answer
    if (verifyAnswerBtn) {
        verifyAnswerBtn.addEventListener('click', () => {
            browser.storage.sync.get(['settings'], (result) => {
                const savedAnswer = result.settings.securityAnswer;
                const userAnswer = recoveryAnswer.value.trim();
                
                if (userAnswer === savedAnswer) {
                    securityRecovery.style.display = 'none';
                    newPasswordSection.style.display = 'block';
                    showMessage('Security answer correct! You can now set a new password.', 'success');
                } else {
                    showMessage('Incorrect answer. Please try again or use emergency reset.', 'error');
                    recoveryAnswer.value = '';
                }
            });
        });
    }

    // Reset Password
    if (resetPasswordBtn) {
        resetPasswordBtn.addEventListener('click', () => {
            const newPass = newPasswordInput.value;
            if (newPass) {
                if (newPass.length < 4) {
                    showMessage('Password should be at least 4 characters long.', 'warning');
                    return;
                }
                
                saveSetting('password', newPass);
                showMessage('Password reset successfully! Alhamdulillah.', 'success');
                
                // Return to locked view
                setTimeout(() => {
                    settingsView.style.display = 'none';
                    lockedView.style.display = 'block';
                    recoveryView.style.display = 'none';
                    newPasswordInput.value = '';
                    recoveryAnswer.value = '';
                    newPasswordSection.style.display = 'none';
                }, 1500);
            }
        });
    }

    // Emergency Reset
    if (emergencyResetBtn) {
        emergencyResetBtn.addEventListener('click', () => {
            const confirmReset = confirm(
                'Bismillah - Emergency Reset\n\n' +
                'This will remove ALL passwords and security questions, returning the extension to unlocked state.\n\n' +
                'Your blocking settings will remain intact.\n\n' +
                'This action cannot be undone. Continue?'
            );
            
            if (confirmReset) {
                const secondConfirm = confirm(
                    'Final Confirmation Required\n\n' +
                    'Type OK in the next dialog to proceed with emergency reset.'
                );
                
                if (secondConfirm) {
                    // Remove all password-related settings
                    browser.storage.sync.get(['settings'], (result) => {
                        const settings = result.settings || {};
                        delete settings.password;
                        delete settings.securityQuestion;
                        delete settings.securityAnswer;
                        
                        browser.storage.sync.set({ settings }, () => {
                            showMessage('Emergency reset completed. Extension is now unlocked.', 'success');
                            
                            setTimeout(() => {
                                settingsView.style.display = 'block';
                                lockedView.style.display = 'none';
                                recoveryView.style.display = 'none';
                            }, 1500);
                        });
                    });
                }
            }
        });
    }

    // Back to Login
    if (backToLoginBtn) {
        backToLoginBtn.addEventListener('click', () => {
            settingsView.style.display = 'none';
            lockedView.style.display = 'block';
            recoveryView.style.display = 'none';
            recoveryAnswer.value = '';
            newPasswordInput.value = '';
            newPasswordSection.style.display = 'none';
        });
    }

    // Donate button functionality
    if (donateBtn) {
        donateBtn.addEventListener('click', () => {
            browser.tabs.create({
                url: 'https://buy.stripe.com/28E3cwea897i8vkh2l14400'
            });
        });
    }

    if (donateBtnLocked) {
        donateBtnLocked.addEventListener('click', () => {
            browser.tabs.create({
                url: 'https://buy.stripe.com/28E3cwea897i8vkh2l14400'
            });
        });
    }

    // --- Functions ---
    function saveSetting(key, value) {
        browser.storage.sync.get(['settings'], (result) => {
            const settings = result.settings || {};
            settings[key] = value;
            browser.storage.sync.set({ settings });
        });
    }
    
        function saveHaramKeywords() {
            browser.storage.sync.get(['settings'], (result) => {
                const settings = result.settings || {};
                settings.haramKeywords = haramKeywords;
                browser.storage.sync.set({ settings });
            });
        }
    
        function saveSocialDomains() {
            browser.storage.sync.get(['settings'], (result) => {
                const settings = result.settings || {};
                settings.socialDomains = socialDomains;
                browser.storage.sync.set({ settings });
            });
        }
    
        function renderHaramList() {
            haramList.innerHTML = '';
            haramKeywords.forEach((keyword, index) => {
                const chip = document.createElement('div');
                chip.className = 'chip';
                chip.textContent = keyword;
                const closeBtn = document.createElement('span');
                closeBtn.className = 'close';
                closeBtn.textContent = '×';
                closeBtn.onclick = () => removeHaramKeyword(index);
                chip.appendChild(closeBtn);
                haramList.appendChild(chip);
            });
        }
    
        function addHaramKeyword() {
            const keyword = haramInput.value.trim().toLowerCase();
            if (keyword && !haramKeywords.includes(keyword)) {
                haramKeywords.push(keyword);
                saveHaramKeywords();
                renderHaramList();
                haramInput.value = '';
                showMessage(`Keyword "${keyword}" added to haram list.`, 'success');
            } else if (haramKeywords.includes(keyword)) {
                showMessage('This keyword is already in your haram list.', 'warning');
            }
        }
    
        function removeHaramKeyword(index) {
            const removedKeyword = haramKeywords[index];
            haramKeywords.splice(index, 1);
            saveHaramKeywords();
            renderHaramList();
            showMessage(`Keyword "${removedKeyword}" removed from haram list.`, 'info');
        }
    
        function renderSocialList() {
            socialList.innerHTML = '';
            socialDomains.forEach((domain, index) => {
                const chip = document.createElement('div');
                chip.className = 'chip';
                chip.textContent = domain;
                const closeBtn = document.createElement('span');
                closeBtn.className = 'close';
                closeBtn.textContent = '×';
                closeBtn.onclick = () => removeSocialDomain(index);
                chip.appendChild(closeBtn);
                socialList.appendChild(chip);
            });
        }
    
        function addSocialDomain() {
            const domain = socialInput.value.trim().toLowerCase();
            if (domain && !socialDomains.includes(domain)) {
                socialDomains.push(domain);
                saveSocialDomains();
                renderSocialList();
                socialInput.value = '';
                showMessage(`Domain "${domain}" added to social media list.`, 'success');
            } else if (socialDomains.includes(domain)) {
                showMessage('This domain is already in your social media list.', 'warning');
            }
        }
    
        function removeSocialDomain(index) {
            const removedDomain = socialDomains[index];
            socialDomains.splice(index, 1);
            saveSocialDomains();
            renderSocialList();
            showMessage(`Domain "${removedDomain}" removed from social media list.`, 'info');
        }

    function showMessage(message, type = 'info') {
        // Create temporary message element
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            right: 10px;
            padding: 12px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        // Set colors based on type
        switch(type) {
            case 'success':
                messageDiv.style.backgroundColor = '#d4edda';
                messageDiv.style.color = '#155724';
                messageDiv.style.border = '1px solid #c3e6cb';
                break;
            case 'error':
                messageDiv.style.backgroundColor = '#f8d7da';
                messageDiv.style.color = '#721c24';
                messageDiv.style.border = '1px solid #f5c6cb';
                break;
            case 'warning':
                messageDiv.style.backgroundColor = '#fff3cd';
                messageDiv.style.color = '#856404';
                messageDiv.style.border = '1px solid #ffeaa7';
                break;
            default:
                messageDiv.style.backgroundColor = '#d1ecf1';
                messageDiv.style.color = '#0c5460';
                messageDiv.style.border = '1px solid #bee5eb';
        }
        
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);
        
        // Fade in
        setTimeout(() => messageDiv.style.opacity = '1', 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            messageDiv.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(messageDiv)) {
                    document.body.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }

    function renderKeywords() {
        keywordList.innerHTML = '';
        customKeywords.forEach((keyword, index) => {
            const chip = document.createElement('div');
            chip.className = 'chip';
            chip.textContent = keyword;
            const closeBtn = document.createElement('span');
            closeBtn.className = 'close';
            closeBtn.textContent = '×';
            closeBtn.onclick = () => removeKeyword(index);
            chip.appendChild(closeBtn);
            keywordList.appendChild(chip);
        });
    }

    function addKeyword() {
        const keyword = keywordInput.value.trim().toLowerCase();
        if (keyword && !customKeywords.includes(keyword)) {
            customKeywords.push(keyword);
            saveSetting('customKeywords', customKeywords);
            renderKeywords();
            keywordInput.value = '';
            showMessage(`Keyword "${keyword}" added to blocklist.`, 'success');
        } else if (customKeywords.includes(keyword)) {
            showMessage('This keyword is already in your blocklist.', 'warning');
        }
    }

    function removeKeyword(index) {
        const removedKeyword = customKeywords[index];
        customKeywords.splice(index, 1);
        saveSetting('customKeywords', customKeywords);
        renderKeywords();
        showMessage(`Keyword "${removedKeyword}" removed from blocklist.`, 'info');
    }
});
