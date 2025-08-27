# Routine Management App

## Overview
The Routine Management App is a simple web application designed to help users manage their daily routines effectively. It allows users to add, edit, and delete tasks, track their completion, and accumulate experience points (XP) for leveling up. The app features a timer to help users stay focused on their tasks.

## Features
- **Task Management**: Add, edit, and delete tasks with ease.
- **Timer Functionality**: Start a timer for each task to enhance focus and productivity.
- **XP System**: Accumulate XP based on task completion and level up as you progress.
- **Local Storage**: All tasks and user data are stored in the browser's local storage for persistence.

## File Structure
```
routine-management-app
├── src
│   ├── js
│   │   ├── app.js          # Main application logic for managing routines
│   │   ├── timer.js        # Timer functionality management
│   │   ├── tasks.js        # Task management features
│   │   ├── xp-system.js     # XP calculation and leveling logic
│   │   └── storage.js      # Local storage management
│   ├── css
│   │   ├── style.css       # Main styles for the app
│   │   ├── timer.css       # Styles specific to the timer screen
│   │   ├── tasks.css       # Styles specific to the tasks management screen
│   │   └── components.css   # Common component styles
│   └── html
│       ├── index.html      # Home screen of the app
│       ├── timer.html      # Timer screen
│       ├── tasks.html      # Task management screen
│       └── profile.html     # User profile screen
├── assets
│   └── icons
│       └── placeholder.txt  # Placeholder for icons
├── package.json             # Project dependencies and scripts
└── README.md                # Project documentation
```

## Usage
1. Clone the repository to your local machine.
2. Open `src/html/index.html` in your web browser to start using the app.
3. Use the task management features to create and manage your tasks.
4. Start the timer for each task to help maintain focus.
5. Track your XP and level up as you complete tasks.

## Privacy
All data is stored locally in your browser and is not shared with any external servers. Your tasks and progress are private and secure.

## Contributing
Feel free to submit issues or pull requests if you have suggestions for improvements or new features.