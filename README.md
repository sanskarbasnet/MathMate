# MathMate

MathMate is a React Native application built with Expo that helps users solve mathematical problems and visualize mathematical concepts.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Expo Go](https://expo.dev/client) app on your mobile device (for testing on physical devices)

## Setting Up Expo Go

1. Install Expo Go on your mobile device:

   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Make sure your mobile device and development machine are on the same network.

3. When you run the app using `npm start`, you'll see a QR code in your terminal:

   - iOS: Open your phone's camera and point it at the QR code
   - Android: Open Expo Go app and scan the QR code using the "Scan QR Code" option

4. The app will load on your device. You can now test the app in real-time, and any changes you make to the code will automatically reload the app.

## Installation

1. Clone the repository:

```bash
git clone https://github.com/sanskarbasnet/MathMate.git
cd mathmate
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory and add your OpenAI API key:

```
OPENAI_API_KEY=your_api_key_here
```

## Running the App

### Development Mode

1. Start the development server:

```bash
npm start
```

2. You can then run the app on:

- iOS simulator: Press `i` in the terminal or run `npm run ios`
- Android emulator: Press `a` in the terminal or run `npm run android`
- Web browser: Press `w` in the terminal or run `npm run web`
- Physical device: Scan the QR code with your phone's camera (iOS) or the Expo Go app (Android)

### Building for Production

To create a production build:

1. For Android:

```bash
expo build:android
```

2. For iOS:

```bash
expo build:ios
```

## Project Structure

- `/components` - Reusable React components
- `/screens` - Main app screens
- `/utils` - Utility functions and helpers
- `/types` - TypeScript type definitions
- `/assets` - Images, fonts, and other static assets

## Dependencies

Key dependencies include:

- React Native
- Expo
- OpenAI API integration
- React Native Chart Kit
- React Native MathJax
- AsyncStorage
- Camera functionality
- WebView support

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the repository or contact the maintainers.
