document.addEventListener('DOMContentLoaded', () => {
    const continueBtn = document.getElementById('continueBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');

    async function submitKey() {
        const apiKey = apiKeyInput.value.trim();

        if (!apiKey) {
            alert("Please enter an API key");
            return;
        }

        // Check if pywebview is available
        if (!window.pywebview || !window.pywebview.api) {
            console.error('pywebview API not available');
            alert('Internal Error: pywebview API not connected');
            return;
        }

        continueBtn.disabled = true;
        const originalText = continueBtn.textContent;
        continueBtn.textContent = 'Verifying...';

        try {
            const response = await window.pywebview.api.validate_and_save_key(apiKey);

            if (response.success) {
                continueBtn.textContent = 'Success! Restarting...';
                // The backend will restart the application
            } else {
                continueBtn.disabled = false;
                continueBtn.textContent = originalText;
                alert('Validation Failed: ' + (response.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error calling backend:', error);
            continueBtn.disabled = false;
            continueBtn.textContent = originalText;
            alert('Error communicating with backend: ' + error);
        }
    }

    continueBtn.addEventListener('click', submitKey);

    // Allow Enter key to submit
    apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitKey();
        }
    });
});
