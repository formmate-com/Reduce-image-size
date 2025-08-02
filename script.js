document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const originalSizeText = document.getElementById('originalSizeText');
    const reducedSizeText = document.getElementById('reducedSizeText');
    const targetSizeInput = document.getElementById('targetSizeInput');
    const reduceButton = document.getElementById('reduceButton');
    const outputContainer = document.getElementById('outputContainer');
    const downloadLink = document.getElementById('downloadLink');

    // State
    let originalImage = null;
    let originalFile = null;

    // Helper to format bytes to KB/MB
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Helper to convert dataURL to Blob
    const dataURLtoBlob = (dataurl) => {
        const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    };
    
    // File Handling
    const handleFile = (file) => {
        if (!file || !file.type.startsWith('image/')) {
            alert("Please select a valid image file.");
            return;
        }
        originalFile = file;
        originalSizeText.textContent = formatFileSize(file.size);

        const reader = new FileReader();
        reader.onload = (e) => {
            const imageDataUrl = e.target.result;
            imagePreview.src = imageDataUrl;
            uploadArea.classList.add('image-loaded');
            originalImage = new Image();
            originalImage.src = imageDataUrl;
        };
        reader.readAsDataURL(file);
    };

    imageInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
    // Drag and Drop Listeners
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eName => uploadArea.addEventListener(eName, e => { e.preventDefault(); e.stopPropagation(); }, false));
    ['dragenter', 'dragover'].forEach(eName => uploadArea.addEventListener(eName, () => uploadArea.classList.add('dragover'), false));
    ['dragleave', 'drop'].forEach(eName => uploadArea.addEventListener(eName, () => uploadArea.classList.remove('dragover'), false));
    uploadArea.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]), false);

    // Main Reduction Logic
    reduceButton.addEventListener('click', async () => {
        if (!originalImage || !originalFile) {
            alert('Please upload an image first.');
            return;
        }
        const targetSizeKB = parseFloat(targetSizeInput.value);
        if (isNaN(targetSizeKB) || targetSizeKB <= 0) {
            alert('Please enter a valid target size in KB.');
            return;
        }
        const targetSizeBytes = targetSizeKB * 1024;

        if (originalFile.size <= targetSizeBytes) {
            alert('The image is already smaller than the target size.');
            return;
        }

        reduceButton.disabled = true;
        reduceButton.textContent = 'Reducing...';

        try {
            // Create a canvas with the original dimensions
            const canvas = document.createElement('canvas');
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(originalImage, 0, 0);

            // Binary search for the best quality
            let minQuality = 0;
            let maxQuality = 1;
            let bestImageDataUrl = '';

            for (let i = 0; i < 10; i++) { // 10 iterations are usually enough
                const currentQuality = (minQuality + maxQuality) / 2;
                const dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
                const blob = dataURLtoBlob(dataUrl);

                if (blob.size <= targetSizeBytes) {
                    bestImageDataUrl = dataUrl;
                    minQuality = currentQuality; // Try for better quality
                } else {
                    maxQuality = currentQuality; // Quality is too high
                }
            }

            if (bestImageDataUrl) {
                const finalBlob = dataURLtoBlob(bestImageDataUrl);
                reducedSizeText.textContent = formatFileSize(finalBlob.size);
                downloadLink.href = bestImageDataUrl;
                outputContainer.style.display = 'block';
            } else {
                alert('Could not reduce the image to the target size. Try a larger size.');
                reducedSizeText.textContent = '-';
            }

        } catch (error) {
            console.error('Error during reduction:', error);
            alert('An error occurred. The image might be too large or in an unsupported format.');
        } finally {
            reduceButton.disabled = false;
            reduceButton.textContent = 'Reduce Size';
        }
    });
});
