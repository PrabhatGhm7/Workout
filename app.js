// Global variables
let mediaRecorder;
let recordedChunks = [];
let currentVideoBlob = null;
let currentStream = null;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    displayExercises();
    registerServiceWorker();
}

function setupEventListeners() {
    // File input change handler
    document.getElementById('video').addEventListener('change', handleFileInput);
    
    // Record button handlers
    document.getElementById('recordBtn').addEventListener('click', startRecording);
    document.getElementById('stopBtn').addEventListener('click', stopRecording);
    
    // Upload button handler
    document.getElementById('uploadBtn').addEventListener('click', function() {
        document.getElementById('video').click();
    });
    
    // Form submission handler
    document.getElementById('exerciseForm').addEventListener('submit', handleFormSubmit);
}

// Status message functions
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.className = `status-message status-${type}`;
    statusDiv.textContent = message;
    setTimeout(() => statusDiv.textContent = '', 3000);
}

// File input handler
function handleFileInput(e) {
    const file = e.target.files[0];
    if (file) {
        currentVideoBlob = file;
        showVideoPreview(file);
        showStatus('Video selected successfully!', 'success');
    }
}

// Video preview function
function showVideoPreview(file) {
    const preview = document.getElementById('videoPreview');
    const video = document.createElement('video');
    video.controls = true;
    video.className = 'video-preview';
    video.src = URL.createObjectURL(file);
    preview.innerHTML = '';
    preview.appendChild(video);
}

// Create live camera preview
function createLivePreview(stream) {
    const preview = document.getElementById('videoPreview');
    const video = document.createElement('video');
    video.className = 'video-preview live-preview';
    video.autoplay = true;
    video.muted = true; // Prevent audio feedback
    video.playsInline = true; // Important for mobile
    video.srcObject = stream;
    
    // Add recording indicator
    const indicator = document.createElement('div');
    indicator.className = 'recording-indicator';
    indicator.innerHTML = '🔴 RECORDING';
    
    preview.innerHTML = '';
    preview.style.position = 'relative';
    preview.appendChild(video);
    preview.appendChild(indicator);
}

// Start recording function
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }, 
            audio: true 
        });
        
        // Store the stream reference
        currentStream = stream;
        
        // Show live preview
        createLivePreview(stream);
        
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];
        
        mediaRecorder.addEventListener('dataavailable', function(e) {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        });
        
        mediaRecorder.addEventListener('stop', function() {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            currentVideoBlob = blob;
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            currentStream = null;
            
            // Show recorded video preview
            showVideoPreview(blob);
            showStatus('Video recorded successfully!', 'success');
        });
        
        mediaRecorder.start();
        
        // Update UI
        updateRecordingUI(true);
        showStatus('Recording started... You can see yourself on screen!', 'info');
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        showStatus('Camera access denied or not available. Try using file upload instead.', 'error');
        handleCameraError(error);
    }
}

// Stop recording function
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    // Stop the stream if it's still active
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    updateRecordingUI(false);
}

// Update recording UI
function updateRecordingUI(isRecording) {
    const recordBtn = document.getElementById('recordBtn');
    const stopBtn = document.getElementById('stopBtn');
    
    if (isRecording) {
        recordBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        recordBtn.classList.add('recording');
    } else {
        recordBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        recordBtn.classList.remove('recording');
    }
}

// Handle camera errors
function handleCameraError(error) {
    let errorMessage = 'Camera access failed. ';
    
    switch(error.name) {
        case 'NotAllowedError':
            errorMessage += 'Please allow camera permissions.';
            break;
        case 'NotFoundError':
            errorMessage += 'No camera found on device.';
            break;
        case 'NotSupportedError':
            errorMessage += 'Camera not supported in this browser.';
            break;
        default:
            errorMessage += 'Try using file upload instead.';
    }
    
    showStatus(errorMessage, 'error');
}

// Form submission handler
function handleFormSubmit(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value;
    const bodyPart = document.getElementById('bodyPart').value;
    const note = document.getElementById('note').value;
    
    if (!name.trim()) {
        showStatus('Please enter an exercise name', 'error');
        return;
    }
    
    if (!bodyPart) {
        showStatus('Please select a body part', 'error');
        return;
    }
    
    if (currentVideoBlob) {
        const reader = new FileReader();
        reader.onload = function () {
            saveExercise({
                id: Date.now(),
                name: name.trim(),
                bodyPart,
                note: note.trim(),
                videoURL: reader.result,
                timestamp: new Date().toISOString()
            });
        };
        reader.readAsDataURL(currentVideoBlob);
    } else {
        saveExercise({
            id: Date.now(),
            name: name.trim(),
            bodyPart,
            note: note.trim(),
            videoURL: null,
            timestamp: new Date().toISOString()
        });
    }
}

// Save exercise function
function saveExercise(data) {
    try {
        // Initialize storage if it doesn't exist
        if (!window.exerciseStorage) {
            window.exerciseStorage = [];
        }
        
        // Add new exercise
        window.exerciseStorage.push(data);
        
        // Reset form and update display
        resetForm();
        displayExercises();
        showStatus('Exercise added successfully!', 'success');
        
    } catch (error) {
        console.error('Error saving exercise:', error);
        showStatus('Error saving exercise. Please try again.', 'error');
    }
}

// Reset form function
function resetForm() {
    document.getElementById('exerciseForm').reset();
    document.getElementById('videoPreview').innerHTML = '';
    currentVideoBlob = null;
    
    // Stop any active stream
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    // Reset any recording state
    updateRecordingUI(false);
}

// Delete exercise function
function deleteExercise(id) {
    try {
        if (!window.exerciseStorage) {
            window.exerciseStorage = [];
        }
        
        window.exerciseStorage = window.exerciseStorage.filter(ex => ex.id !== id);
        
        displayExercises();
        showStatus('Exercise deleted', 'info');
        
    } catch (error) {
        console.error('Error deleting exercise:', error);
        showStatus('Error deleting exercise', 'error');
    }
}

// Display exercises function
function displayExercises() {
    try {
        const exercises = window.exerciseStorage || [];
        const grouped = groupExercisesByBodyPart(exercises);
        renderExercises(grouped);
        
    } catch (error) {
        console.error('Error displaying exercises:', error);
        showStatus('Error loading exercises', 'error');
    }
}

// Group exercises by body part
function groupExercisesByBodyPart(exercises) {
    const grouped = {};
    
    exercises.forEach((ex) => {
        if (!grouped[ex.bodyPart]) {
            grouped[ex.bodyPart] = [];
        }
        grouped[ex.bodyPart].push(ex);
    });
    
    return grouped;
}

// Render exercises
function renderExercises(grouped) {
    const container = document.getElementById('exercises');
    container.innerHTML = '';

    // Sort body parts alphabetically
    const sortedBodyParts = Object.keys(grouped).sort();

    sortedBodyParts.forEach(bodyPart => {
        const partDiv = createBodyPartSection(bodyPart, grouped[bodyPart]);
        container.appendChild(partDiv);
    });
    
    // Show message if no exercises
    if (sortedBodyParts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No exercises added yet. Add your first exercise above!</p>';
    }
}

// Create body part section
function createBodyPartSection(bodyPart, exercises) {
    const partDiv = document.createElement('div');
    partDiv.className = 'body-part-section';
    
    const heading = document.createElement('h2');
    heading.textContent = bodyPart;
    partDiv.appendChild(heading);

    // Sort exercises by timestamp (newest first)
    exercises.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    exercises.forEach((ex) => {
        const exDiv = createExerciseEntry(ex);
        partDiv.appendChild(exDiv);
    });

    return partDiv;
}

// Create exercise entry
function createExerciseEntry(exercise) {
    const exDiv = document.createElement('div');
    exDiv.className = 'exercise-entry';
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '❌ Delete';
    deleteBtn.onclick = () => {
        if (confirm('Are you sure you want to delete this exercise?')) {
            deleteExercise(exercise.id);
        }
    };
    
    // Exercise title
    const title = document.createElement('strong');
    title.textContent = exercise.name;
    title.style.fontSize = '18px';
    title.style.display = 'block';
    title.style.marginBottom = '10px';
    
    // Exercise note
    const note = document.createElement('p');
    note.textContent = exercise.note || 'No notes added';
    note.style.marginBottom = '10px';
    note.style.color = exercise.note ? '#666' : '#999';
    note.style.fontStyle = exercise.note ? 'normal' : 'italic';
    
    // Timestamp
    const timestamp = document.createElement('small');
    timestamp.textContent = formatTimestamp(exercise.timestamp);
    timestamp.style.color = '#999';
    timestamp.style.display = 'block';
    timestamp.style.marginBottom = '10px';
    
    // Append elements
    exDiv.appendChild(deleteBtn);
    exDiv.appendChild(title);
    exDiv.appendChild(note);
    exDiv.appendChild(timestamp);
    
    // Add video if exists
    if (exercise.videoURL) {
        const video = document.createElement('video');
        video.src = exercise.videoURL;
        video.controls = true;
        video.style.maxWidth = '100%';
        video.style.borderRadius = '8px';
        video.style.marginTop = '10px';
        exDiv.appendChild(video);
    }
    
    return exDiv;
}

// Format timestamp
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(() => {
                console.log('Service Worker Registered');
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    }
}

// Cleanup function for when page is unloaded
window.addEventListener('beforeunload', () => {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
});

// Export functions for global access (if needed)
window.deleteExercise = deleteExercise;