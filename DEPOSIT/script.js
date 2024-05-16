// Initialize IndexedDB
// script.js
var sidebar = document.querySelector('.sidebar');
var main = document.querySelector('main');

function openSidebar() {
    sidebar.style.left = "0";
    main.style.marginLeft = "100px";
}

function closeSidebar() {
    sidebar.style.left = "-200px";
    main.style.marginLeft= "0";
}

// JavaScript for file upload, display, and other functions
// (Your existing JavaScript code for file upload, display, etc. goes here)

var db;
var dbInitialized = false;

function initDB() {
    if (dbInitialized) {
        console.log("Database already initialized.");
        return;
    }

    var request = window.indexedDB.open('MyDriveDB', 1);

    request.onerror = function(event) {
        console.log("Database error: " + event.target.errorCode);
    };

    request.onsuccess = function(event) {
        console.log("Database initialized successfully.");
        db = event.target.result;
        displayFiles();
        displayTrash();
        dbInitialized = true;
    };

    request.onupgradeneeded = function(event) {
        console.log("Database upgrade needed.");
        var db = event.target.result;
        var filesStore = db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
        if (!filesStore.indexNames.contains('name')) {
            filesStore.createIndex('name', 'name', { unique: false });
        }
        var trashStore = db.createObjectStore('trash', { keyPath: 'id', autoIncrement: true });
    };
}

// Upload file function
function uploadFile() {
    var fileInput = document.getElementById('fileInput');

    // Check if a file is selected
    if (fileInput.files.length === 0) {
        alert("Please select a file first!");
        return;
    }

    var file = fileInput.files[0];
    var fileSize = file.size / (1024 * 1024); // Convert to MB

    if (fileSize > 12) {
        alert("File size exceeds the limit (12MB)!");
        return;
    }

    var transaction = db.transaction(['files'], 'readwrite');
    var objectStore = transaction.objectStore('files');

    var fileRecord = {
        name: file.name,
        size: fileSize.toFixed(2) + 'MB',
        data: file,
        status: 'active'
    };

    var request = objectStore.add(fileRecord);

    request.onsuccess = function(event) {
        console.log('File uploaded successfully.');
        displayFiles();
    };

    request.onerror = function(event) {
        console.log('Error uploading file: ' + event.target.errorCode);
    };
}

function renameFilePrompt(key, currentFileName) {
    var newFileName = prompt("Enter the new file name:");
    if (newFileName && newFileName !== currentFileName) {
        renameFile(key, currentFileName, newFileName);
    }
}

function renameFile(key, currentFileName, newFileName) {
    var transaction = db.transaction(['files'], 'readwrite');
    var objectStore = transaction.objectStore('files');

    var getRequest = objectStore.get(key);
    getRequest.onsuccess = function(event) {
        var fileData = event.target.result;
        if (fileData) {
            fileData.name = newFileName;

            var putRequest = objectStore.put(fileData);
            putRequest.onsuccess = function(event) {
                console.log('File renamed successfully.');
                displayFiles();
            };

            putRequest.onerror = function(event) {
                console.log('Error renaming file: ' + event.target.errorCode);
            };
        } else {
            console.log('File not found.');
        }
    };

    getRequest.onerror = function(event) {
        console.log('Error retrieving file for renaming: ' + event.target.errorCode);
    };
}

// Display files function
function displayFiles() {
    var fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
  
    var transaction = db.transaction(['files'], 'readonly');
    var objectStore = transaction.objectStore('files');
    var request = objectStore.openCursor();
    var fileNumber = 1; // Start numbering from 1
  
    request.onsuccess = function(event) {
        var cursor = event.target.result;
        if (cursor) {
            var listItem = document.createElement('div');
            var fileName = cursor.value.name;
            var fileSize = cursor.value.size;
  
            var downloadButton = document.createElement('button');
            downloadButton.textContent = 'Download';
            downloadButton.onclick = (function(fileData, fileName) {
                return function() {
                    downloadFile(fileData, fileName);
                };
            })(cursor.value.data, fileName);
            downloadButton.classList.add('action-btn');
  
            var zipButton = document.createElement('button');
            zipButton.textContent = 'Zip';
            zipButton.onclick = (function(fileData, fileName) {
                return function() {
                    zipFile(fileData, fileName);
                };
            })(cursor.value.data, fileName);
            zipButton.classList.add('action-btn');
  
            var deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = (function(key) {
                return function() {
                    moveToTrash(key);
                };
            })(cursor.key);
            deleteButton.classList.add('action-btn');
  
            var renameButton = document.createElement('button');
            renameButton.textContent = 'Rename';
            renameButton.onclick = (function(key) {
                return function() {
                    renameFilePrompt(key, fileName);
                };
            })(cursor.key);
            renameButton.classList.add('action-btn');
  
            var openButton = document.createElement('button');
            openButton.textContent = 'Open';
            openButton.onclick = (function(fileData, fileName) {
                return function() {
                    openFile(fileData, fileName);
                };
            })(cursor.value.data, fileName);
            openButton.classList.add('action-btn');

            var linkButton = document.createElement('button');
            linkButton.textContent = 'Link';
            linkButton.onclick = (function(fileData, fileName) {
                return function() {
                    generateDownloadLink(fileData, fileName);
                };
            })(cursor.value.data, fileName);
            linkButton.classList.add('action-btn');
            
            listItem.appendChild(linkButton);
            
            listItem.textContent = 'File ' + fileNumber + ': ' + fileName + ', Size: ' + fileSize;
            listItem.appendChild(downloadButton);
            listItem.appendChild(zipButton);
            listItem.appendChild(deleteButton);
            listItem.appendChild(renameButton);
            listItem.appendChild(openButton);
            listItem.appendChild(linkButton);
            fileList.appendChild(listItem);
            cursor.continue();
            fileNumber++; // Increment file number
        }
    };
}

function generateDownloadLink(fileData, fileName) {
    console.log("Generating download link for file:", fileName);

    var url = URL.createObjectURL(fileData);
    console.log("Generated URL:", url);

    var linkText = document.createElement('span');
    linkText.textContent = 'Link to download ' + fileName + ': ';

    var link = document.createElement('a');
    link.href = url;
    link.textContent = 'Download ' + fileName;
    link.classList.add('download-link');
    link.setAttribute('download', fileName);

    // Tambahkan event listener ke elemen link
    link.addEventListener('click', function(event) {
        // Salin URL ke clipboard
        event.preventDefault(); // Menghentikan aksi default (mengikuti link)
        var tempInput = document.createElement("input");
        tempInput.setAttribute("value", url);
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
        alert('Link copied to clipboard!');
    });

    var message = document.createElement('span');
    message.textContent = ' (Click to copy link)'; // Ubah pesan untuk menunjukkan bahwa link akan disalin

    var container = document.createElement('div');
    container.appendChild(linkText);
    container.appendChild(link);
    container.appendChild(message);

    var downloadSection = document.getElementById('downloadSection');
    downloadSection.innerHTML = '';
    downloadSection.appendChild(container);
}

  
// Open file function
function openFile(fileData, fileName) {
    var fileDisplay = document.getElementById('fileDisplay');
    fileDisplay.innerHTML = '';

    var modal = document.getElementById('fileModal');

    var fileExtension = fileName.split('.').pop().toLowerCase();
    var url;

    if (typeof fileData === 'string') {
        // If fileData is already a URL
        url = fileData;
    } else {
        // If fileData is a blob, create a URL for it
        url = URL.createObjectURL(new Blob([fileData], { type: 'application/octet-stream' }));
    }

    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        var img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        fileDisplay.appendChild(img);
    } else if (['mp4', 'webm', 'ogg'].includes(fileExtension)) {
        var video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.style.maxWidth = '100%';
        fileDisplay.appendChild(video);
    } else {
        alert('Only photo and video files can be opened.');
        return;
    }

    modal.style.display = 'flex';
}


function closeModal() {
    var modal = document.getElementById('fileModal');
    modal.style.display = 'none';
}

function display(message) {
    var messageBox = document.getElementById('messageBox');
    if (!messageBox) {
        messageBox = document.createElement('div');
        messageBox.id = 'messageBox';
        document.body.appendChild(messageBox);
    }
    messageBox.textContent = message;
}

// Download file function
// Download file function
// Download file function
function downloadFile(fileData, fileName) {
    var url;
    if (typeof fileData === 'string') {
        // If fileData is already a URL
        url = fileData;
    } else {
        // If fileData is a blob, create a URL for it
        url = URL.createObjectURL(fileData);
    }

    var a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.textContent = 'Download';
    a.classList.add('download-btn');
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Open file function
function openFile(fileData, fileName) {
    var fileDisplay = document.getElementById('fileDisplay');
    fileDisplay.innerHTML = '';

    var modal = document.getElementById('fileModal');

    var fileExtension = fileName.split('.').pop().toLowerCase();
    var url;

    if (typeof fileData === 'string') {
        // If fileData is already a URL
        url = fileData;
    } else {
        // If fileData is a blob, create a URL for it
        url = URL.createObjectURL(fileData);
    }

    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
        var img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        fileDisplay.appendChild(img);
    } else if (['mp4', 'webm', 'ogg'].includes(fileExtension)) {
        var video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.style.maxWidth = '100%';
        fileDisplay.appendChild(video);
    } else {
        alert('Only photo and video files can be opened.');
        return;
    }

    modal.style.display = 'flex';
}



// Zip file function
function zipFile(fileData, fileName) {
    var zip = new JSZip();
    var zipFilename = fileName.split('.')[0] + ".zip";

    zip.file(fileName, fileData);

    zip.generateAsync({ type: "blob" })
        .then(function(content) {
            var url = URL.createObjectURL(content);
            var a = document.createElement('a');
            a.href = url;
            a.download = zipFilename;
            a.textContent = 'Download ZIP';
            a.classList.add('download-btn'); // Tambahkan kelas untuk memperindah tampilan tombol
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(function(error) {
            console.log("Error generating ZIP: " + error);
        });
}

// Move to trash function
function moveToTrash(key) {
    var transaction = db.transaction(['files', 'trash'], 'readwrite');
    var filesStore = transaction.objectStore('files');
    var trashStore = transaction.objectStore('trash');

    var getRequest = filesStore.get(key);

    getRequest.onsuccess = function(event) {
        var fileData = event.target.result;
        if (fileData) {
            var request = trashStore.add(fileData);

            request.onsuccess = function(event) {
                console.log('File moved to trash successfully.');
                deleteFile(key);
                displayFiles();
                displayTrash();
            };

            request.onerror = function(event) {
                console.log('Error moving file to trash: ' + event.target.error.message);
            };
        } else {
            console.log('File not found.');
        }
    };

    getRequest.onerror = function(event) {
        console.log('Error getting file to move to trash: ' + event.target.error.message);
    };
}

// Delete file function
function deleteFile(key) {
    var transaction = db.transaction(['files'], 'readwrite');
    var objectStore = transaction.objectStore('files');
    var request = objectStore.delete(key);

    request.onsuccess = function(event) {
        console.log('File deleted successfully.');
    };

    request.onerror = function(event) {
        console.log('Error deleting file: ' + event.target.errorCode);
    };
}

// Display trash function
function displayTrash() {
  var trashList = document.getElementById('trashList');
  trashList.innerHTML = '';

  var transaction = db.transaction(['trash'], 'readonly');
  var objectStore = transaction.objectStore('trash');
  var request = objectStore.openCursor();

  request.onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
          var listItem = document.createElement('div');
          var fileName = cursor.value.name;
          var fileSize = cursor.value.size;

          var restoreButton = document.createElement('button');
          restoreButton.textContent = 'Restore';
          restoreButton.onclick = (function(key) {
              return function() {
                  restoreFile(key);
              };
          })(cursor.key);
          restoreButton.classList.add('action-btn');

          var deleteButton = document.createElement('button');
          deleteButton.textContent = 'Delete Permanently';
          deleteButton.onclick = (function(key) {
              return function() {
                  deleteFilePermanently(key);
              };
          })(cursor.key);
          deleteButton.classList.add('action-btn');

          listItem.textContent = 'File: ' + fileName + ', Size: ' + fileSize;
          listItem.appendChild(restoreButton);
          listItem.appendChild(deleteButton);
          trashList.appendChild(listItem);
          cursor.continue();
      }
  };
}


// Restore file function
// Restore file function
function restoreFile(key) {
  var transaction = db.transaction(['files', 'trash'], 'readwrite');
  var filesStore = transaction.objectStore('files');
  var trashStore = transaction.objectStore('trash');

  var getRequest = trashStore.get(key);

  getRequest.onsuccess = function(event) {
      var fileData = event.target.result;

      if (!fileData) {
          console.log('File data not found in trash.');
          return;
      }

      var addRequest = filesStore.add(fileData);

      addRequest.onsuccess = function(event) {
          console.log('File restored successfully.');
          var deleteRequest = trashStore.delete(key);

          deleteRequest.onsuccess = function(event) {
              console.log('File removed from trash after restore.');
              displayFiles();
              displayTrash();
          };

          deleteRequest.onerror = function(event) {
              console.log('Error deleting file from trash: ' + event.target.errorCode);
          };
      };

      addRequest.onerror = function(event) {
          console.log('Error adding file back to files store: ' + event.target.errorCode);
      };
  };

  getRequest.onerror = function(event) {
      console.log('Error getting file data from trash: ' + event.target.errorCode);
  };
}


// Restore file function
function restoreFile(key) {
  var transaction = db.transaction(['files', 'trash'], 'readwrite');
  var filesStore = transaction.objectStore('files');
  var trashStore = transaction.objectStore('trash');

  var getRequest = trashStore.get(key);

  getRequest.onsuccess = function(event) {
      var fileData = event.target.result;

      if (!fileData) {
          console.log('File data not found in trash.');
          return;
      }

      var addRequest = filesStore.add(fileData);

      addRequest.onsuccess = function(event) {
          console.log('File restored successfully.');
          var deleteRequest = trashStore.delete(key);

          deleteRequest.onsuccess = function(event) {
              console.log('File removed from trash after restore.');
              displayFiles();
              displayTrash();
          };

          deleteRequest.onerror = function(event) {
              console.log('Error deleting file from trash: ' + event.target.errorCode);
          };
      };

      addRequest.onerror = function(event) {
          console.log('Error adding file back to files store: ' + event.target.errorCode);
      };
  };

  getRequest.onerror = function(event) {
      console.log('Error getting file data from trash: ' + event.target.errorCode);
  };
}


// Delete file permanently function
function deleteFilePermanently(key) {
    var transaction = db.transaction(['trash'], 'readwrite');
    var objectStore = transaction.objectStore('trash');
    var request = objectStore.delete(key);

    request.onsuccess = function(event) {
        console.log('File permanently deleted successfully.');
        displayTrash();
    };

    request.onerror = function(event) {
        console.log('Error deleting file permanently: ' + event.target.errorCode);
    };
}

// Initialize the search input
const searchInput = document.getElementById('searchInput');
const fileList = document.getElementById('fileList');
const trashList = document.getElementById('trashList');
let noResultsElement;

// Add an event listener for the search input
searchInput.addEventListener('input', () => {
  const searchTerm = searchInput.value.toLowerCase();
  let foundInFiles = false;
  let foundInTrash = false;

  // Remove previous "No results found" message
  if (noResultsElement) {
    noResultsElement.remove();
  }
  for (const child of trashList.children) {
    const fileName = child.textContent.toLowerCase();
    const fileNumberMatch = fileName.match(/^file (\d+)/);

    if (fileNumberMatch) {
      const fileNumber = fileNumberMatch[1];
      if (fileNumber.startsWith(searchTerm)) {
        child.style.display = 'block';
        foundInTrash = true;
      } else {
        child.style.display = 'none';
      }
    } else {
      if (fileName.includes(searchTerm)) {
        child.style.display = 'block';
        foundInTrash = true;
      } else {
        child.style.display = 'none';
      }
    }
  }
  // Loop through the file list
  for (const child of fileList.children) {
    if (child.textContent.toLowerCase().includes(searchTerm)) {
      child.style.display = 'block';
      foundInFiles = true;
    } else {
      child.style.display = 'none';
    }
  }

  // Loop through the trash file list
  for (const child of trashList.children) {
    if (child.textContent.toLowerCase().includes(searchTerm)) {
      child.style.display = 'block';
      foundInTrash = true;
    } else {
      child.style.display = 'none';
    }
  }

  // Display "No results found" message if necessary
  if (!foundInFiles && !foundInTrash) {
    noResultsElement = document.createElement('div');
    noResultsElement.id = 'noResults';
    noResultsElement.textContent = 'No results found.';
    fileList.appendChild(noResultsElement);
  } else if (!foundInFiles) {
    noResultsElement = document.createElement('div');
    noResultsElement.id = 'noResults';
    noResultsElement.textContent = 'No results found in files.';
    fileList.appendChild(noResultsElement);
  } else if (!foundInTrash) {
    noResultsElement = document.createElement('div');
    noResultsElement.id = 'noResults';
    noResultsElement.textContent = 'No results found in trash.';
    trashList.appendChild(noResultsElement);
  }
});



function captureFromCamera() {
    // Cek apakah browser mendukung getUserMedia API
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function(stream) {
                var video = document.createElement('video');
                video.style.display = 'none';
                document.body.appendChild(video);
                video.srcObject = stream;
                video.play();

                var captureButton = document.createElement('button');
                captureButton.textContent = 'Capture Photo';
                captureButton.classList.add('action-btn');
                document.body.appendChild(captureButton);

                captureButton.addEventListener('click', function() {
                    var canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    var context = canvas.getContext('2d');
                    context.drawImage(video, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob(function(blob) {
                        uploadCapturedImage(blob);
                        stream.getTracks().forEach(track => track.stop());
                        document.body.removeChild(video);
                        document.body.removeChild(captureButton);
                    }, 'image/jpeg');
                });
            })
            .catch(function(error) {
                console.error("Error accessing camera: ", error);
            });
    } else {
        alert("Camera not supported by your browser.");
    }
}

function uploadCapturedImage(blob) {
    var fileName = 'captured_image_' + Date.now() + '.jpg';
    var fileSize = (blob.size / (1024 * 1024)).toFixed(2) + 'MB';

    var transaction = db.transaction(['files'], 'readwrite');
    var objectStore = transaction.objectStore('files');

    var fileRecord = {
        name: fileName,
        size: fileSize,
        data: blob,
        status: 'active'
    };

    var request = objectStore.add(fileRecord);

    request.onsuccess = function(event) {
        console.log('Captured image uploaded successfully.');
        displayFiles();
    };

    request.onerror = function(event) {
        console.log('Error uploading captured image: ' + event.target.errorCode);
    };
}

var mediaRecorder;
var recordedChunks = [];
var stopCameraButton;

function startCamera() {
    var cameraContainer = document.querySelector('.camera-container');
    cameraContainer.style.display = 'block';

    // Tambahkan tombol "Stop Camera" jika belum ada
    if (!stopCameraButton) {
        stopCameraButton = document.createElement('button');
        stopCameraButton.textContent = 'Stop Camera';
        stopCameraButton.onclick = stopCamera;
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then(function(stream) {
                var video = document.getElementById('video');
                video.srcObject = stream;
                video.play();
            })
            .catch(function(error) {
                console.error("Error accessing camera: ", error);
            });
    } else {
        alert("Camera not supported by your browser.");
    }
}

function capturePhoto() {
  var video = document.getElementById('video');
  var canvas = document.getElementById('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  var context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob(function(blob) {
      uploadCapturedImage(blob);
      var previewImage = document.getElementById('previewImage');
      previewImage.src = URL.createObjectURL(blob);
      document.querySelector('.captured-image').style.display = 'block';
  }, 'image/jpeg');
}

function uploadCapturedImage(blob) {
    var fileName = 'captured_image_' + Date.now() + '.jpg';
    var fileSize = (blob.size / (1024 * 1024)).toFixed(2) + 'MB';

    var transaction = db.transaction(['files'], 'readwrite');
    var objectStore = transaction.objectStore('files');

    var fileRecord = {
        name: fileName,
        size: fileSize,
        data: blob,
        status: 'active'
    };

    var request = objectStore.add(fileRecord);

    request.onsuccess = function(event) {
      console.log('Captured image uploaded successfully.');
      displayFiles();
      stopCamera();
      document.querySelector('.captured-image').style.display = 'none';
  };

  request.onerror = function(event) {
    console.log('Error uploading captured image: ' + event.target.errorCode);
    stopCamera();
    document.querySelector('.captured-image').style.display = 'none';
};
}

var startTime;
// Tambahkan variabel global untuk menyimpan interval waktu
var timerInterval;

// Fungsi untuk memulai atau menghentikan merekam
function toggleRecording() {
    var captureButton = document.getElementById('captureButton');
    if (captureButton.textContent === 'Start Recording') {
        startRecording();
        captureButton.textContent = 'Stop Recording';
    } else {
        stopRecording();
        captureButton.textContent = 'Start Recording';
    }
}


function startRecording() {
    var video = document.getElementById('video');
    var stream = video.srcObject;
    var options = { mimeType: 'video/webm; codecs=vp9' };

    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream, options);

    mediaRecorder.ondataavailable = function(event) {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = function() {
      var blob = new Blob(recordedChunks, { type: 'video/webm' });
      var videoURL = URL.createObjectURL(blob);
      var recordedVideo = document.getElementById('previewVideo');
      recordedVideo.src = videoURL;
      recordedVideo.style.display = 'block';

      uploadRecordedVideo(blob);
  };

    mediaRecorder.start();
    console.log("Recording started");

    document.getElementById('startRecordingButton').style.display = 'none';
    document.getElementById('stopRecordingButton').style.display = 'block';
}

function stopRecording() {
  mediaRecorder.stop();
  var recordedVideo = document.getElementById('previewVideo');
  recordedVideo.src = '';
  recordedVideo.style.display = 'none';

  document.getElementById('startRecordingButton').style.display = 'block';
    // Sembunyikan tombol "Berhenti merekam"
    document.getElementById('stopRecordingButton').style.display = 'none';
}

function uploadRecordedVideo(blob) {
    var fileName = 'recorded_video_' + Date.now() + '.webm';
    var fileSize = (blob.size / (1024 * 1024)).toFixed(2) + 'MB';

    var transaction = db.transaction(['files'], 'readwrite');
    var objectStore = transaction.objectStore('files');

    var fileRecord = {
        name: fileName,
        size: fileSize,
        data: blob,
        status: 'active'
    };

    var request = objectStore.add(fileRecord);

    request.onsuccess = function(event) {
      console.log('Recorded video uploaded successfully.');
      displayFiles();
      stopCamera();
      var recordedVideo = document.getElementById('previewVideo');recordedVideo.src = '';
      recordedVideo.style.display = 'none';
  };

  request.onerror = function(event) {
    console.log('Error uploading recorded video: ' + event.target.errorCode);
    stopCamera();
    var recordedVideo = document.getElementById('previewVideo');
    recordedVideo.src = '';
    recordedVideo.style.display = 'none';
};
}

function stopCamera() {
    var video = document.getElementById('video');
    var stream = video.srcObject;
    var tracks = stream.getTracks();

    tracks.forEach(function(track) {
        track.stop();
    });

    video.srcObject = null;

    // Sembunyikan tombol "Stop Camera" tanpa menghapusnya
    stopCameraButton.style.display = 'none';
}


function openCamera() {
    document.getElementById('cameraContainer').style.display = 'flex';
    document.getElementById('openCameraButton').style.display = 'none';
    document.getElementById('closeCameraButton').style.display = 'block';
}

function closeCamera() {

    // Menyembunyikan elemen kamera
    document.getElementById('cameraContainer').style.display = 'none';
    document.getElementById('openCameraButton').style.display = 'block';
    document.getElementById('closeCameraButton').style.display = 'none';

    stopCamera();

}

// Initialize the database when the page loads
initDB();