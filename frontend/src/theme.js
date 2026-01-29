import { createTheme } from '@mui/material/styles';

const getTheme = (mode) => createTheme({
    palette: {
        mode,
        primary: {
            main: '#ffcc00', // MTN Yellow
            dark: '#e6b800',
            light: '#ffd633',
            contrastText: '#000000',
        },
        secondary: {
            main: '#ffffff',
            contrastText: '#000000',
        },
        background: {
            default: mode === 'dark' ? '#0a0c10' : '#f8f9fa',
            paper: mode === 'dark' ? '#12161f' : '#ffffff',
        },
        text: {
            primary: mode === 'dark' ? '#ffffff' : '#1a1a1a',
            secondary: mode === 'dark' ? 'rgba(255, 255, 255, 0.6)' : '#666666',
        },
        divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    typography: {
        fontFamily: '"Lexend", "Inter", "system-ui", sans-serif',
        h4: { fontWeight: 900, letterSpacing: '-1.5px', textTransform: 'none' },
        h6: { fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem' },
        h2: { fontWeight: 900, letterSpacing: '-2px' },
        h1: { fontWeight: 900, letterSpacing: '-2.5px' },
        body1: { lineHeight: 1.6 }
    },
    shape: {
        borderRadius: 16
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    boxShadow: mode === 'dark' ? '0 10px 40px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.03)',
                    border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0,0,0,0.02)',
                }
            }
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: mode === 'dark' ? '#0a0c10' : '#ffffff',
                    color: mode === 'dark' ? '#ffffff' : '#000000',
                    borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
                    boxShadow: 'none',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: mode === 'dark' ? '#0a0c10' : '#ffffff',
                    borderRight: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    textTransform: 'none',
                    fontWeight: 600,
                    padding: '10px 24px',
                },
                containedPrimary: {
                    '&:hover': {
                        backgroundColor: '#e6b800',
                    }
                }
            }
        }
    },
});

export default getTheme;
