const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  {
    path: 'frontend/src/pages/AdminClassRequests.jsx',
    replacements: [
      { from: 'sm:flex sm:flex-row-reverse"', to: 'flex justify-center gap-4"' },
      { from: 'flex flex-row-reverse rounded-b-lg"', to: 'flex justify-center gap-4 rounded-b-lg"' },
      { from: 'flex flex-row-reverse rounded-b-lg"', to: 'flex justify-center gap-4 rounded-b-lg"' }
    ]
  },
  {
    path: 'frontend/src/pages/ClassCatalog.jsx',
    replacements: [
      { from: 'flex flex-row-reverse"', to: 'flex justify-center gap-4"' }
    ]
  },
  {
    path: 'frontend/src/pages/ClassRequest.jsx',
    replacements: [
      { from: 'flex flex-row-reverse rounded-b-lg"', to: 'flex justify-center gap-4 rounded-b-lg"' }
    ]
  },
  {
    path: 'frontend/src/components/AdminAppointmentModal.jsx',
    replacements: [
      { from: 'flex justify-end gap-4"', to: 'flex justify-center gap-4"' }
    ]
  },
  {
    path: 'frontend/src/components/CloseClassModal.jsx',
    replacements: [
      { from: 'flex justify-end gap-4 mt-8"', to: 'flex justify-center gap-4 mt-8"' }
    ]
  },
  {
    path: 'frontend/src/components/CompleteProfileModal.jsx',
    replacements: [
      { from: 'flex justify-end"', to: 'flex justify-center gap-4"' }
    ]
  },
  {
    path: 'frontend/src/components/FileViewerModal.jsx',
    replacements: [
      { from: 'flex justify-end"', to: 'flex justify-center gap-4"' }
    ]
  },
  {
    path: 'frontend/src/components/ProfilePictureModal.jsx',
    replacements: [
      { from: 'flex justify-end gap-4"', to: 'flex justify-center gap-4"' }
    ]
  },
  {
    path: 'frontend/src/components/RegistrantsModal.jsx',
    replacements: [
      { from: 'flex justify-end pt-4 mt-4 border-t"', to: 'flex justify-center pt-4 mt-4 border-t gap-4"' }
    ]
  },
  {
    path: 'frontend/src/components/UserDetailsModal.jsx',
    replacements: [
      { from: 'flex justify-end"', to: 'flex justify-center gap-4"' }
    ]
  },
  {
    path: 'frontend/src/contexts/UserDetailsModal.jsx',
    replacements: [
      { from: 'flex justify-end"', to: 'flex justify-center gap-4"' }
    ]
  },
  {
    path: 'frontend/src/pages/RegistrantsModal.jsx',
    replacements: [
      { from: 'flex justify-end pt-4 mt-4 border-t"', to: 'flex justify-center pt-4 mt-4 border-t gap-4"' }
    ]
  }
];

filesToUpdate.forEach(({ path: filePath, replacements }) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    replacements.forEach(({ from, to }) => {
      content = content.replace(from, to);
    });
    fs.writeFileSync(filePath, content);
    console.log('Updated ' + filePath);
  } else {
    console.log('File not found: ' + filePath);
  }
});
