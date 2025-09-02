# Aspire Expenses Frontend

A modern React application built with Vite, TypeScript, and Tailwind CSS for managing shared expenses and splitting bills.

## Features

- 🚀 **Vite** - Lightning fast build tool
- ⚛️ **React 18** - Latest React features
- 🔷 **TypeScript** - Type-safe development
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🔐 **JWT Authentication** - Secure user management
- 📱 **Responsive Design** - Mobile-first approach
- 🎯 **Modern UI/UX** - Beautiful and intuitive interface

## Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context + Hooks
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Forms**: React Hook Form
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 16+
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, etc.)
├── pages/              # Page components
├── services/           # API services
├── types/              # TypeScript type definitions
├── App.tsx            # Main app component
├── main.tsx           # App entry point
└── index.css          # Global styles with Tailwind
```

## Development

### Backend API

The frontend is configured to proxy API requests to the backend server running on `http://localhost:5000`. Make sure your backend is running before testing the frontend.

### Environment Variables

Create a `.env` file in the root directory if you need to customize the API endpoint:

```env
VITE_API_URL=http://localhost:5000
```

### Adding New Components

1. Create your component in the appropriate directory
2. Use TypeScript interfaces for props
3. Apply Tailwind CSS classes for styling
4. Export the component as default

### Styling Guidelines

- Use Tailwind CSS utility classes
- Follow the established color scheme (primary, success, warning, danger)
- Maintain consistent spacing and typography
- Ensure responsive design for mobile devices

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

## Contributing

1. Follow TypeScript best practices
2. Use meaningful component and variable names
3. Add proper error handling
4. Test your changes thoroughly
5. Follow the existing code style

## License

This project is part of the Aspire Expenses application.
