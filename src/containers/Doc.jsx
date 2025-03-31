import { Box, Typography, List, ListItem, ListItemButton, ListItemText, Divider, Collapse, Button, IconButton } from "@mui/material";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./Doc.css";
import { ELICITATION_SPACE } from "../contexts/WorkspaceContext";
import { KeyboardDoubleArrowDown, KeyboardDoubleArrowUp, ExpandMore, ExpandLess, Home } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import routes from "../shared/routes";

const SLIDES = [
    {
        title: "What is Bayesian Analysis?",
        slides: ["/slides/slide-0.jpeg", "/slides/slide-1.jpeg"]
    },
    {
        title: "Components of Bayesian Analysis",
        slides: ["/slides/slide-2.jpeg"]
    },
    {
        title: "An Example of Bayesian Analysis",
        slides: ["/slides/slide-3.jpeg"]
    },
    {
        title: "Prior Elicitation",
        slides: ["/slides/slide-4.jpeg",]
    },
    {
        title: "Prior Predictive Check",
        slides: ["/slides/slide-5.jpeg", "/slides/slide-6.jpeg"]
    },
    {
        title: "Parameter Space Elicitation",
        slides: ["/slides/slide-7.jpeg"]
    },
    {
        title: "Observable Space Elicitation",
        slides: ["/slides/slide-8.jpeg"]
    },
]

export default function Doc() {
    const navigate = useNavigate();
    const [openSlides, setOpenSlides] = useState(true);
    const [activeSlideSection, setActiveSlideSection] = useState(null);

    useEffect(() => {
        document.title = "Documentation";
    }, []);

    const handleSlideClick = (index) => {
        setActiveSlideSection(index);
        
        const element = document.getElementById(`slide-section-${index}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const backToHomePage = () => {
        navigate(routes.home);
    };

    const toggleCollapseAll = () => {
        setOpenSlides(!openSlides);
    };

    return (
        <Box className="doc-container">
            {/* Sidebar */}
            <Box className="sidebar">
                <Box className="sidebar-header">
                    <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                        <IconButton onClick={backToHomePage}>
                            <Home fontSize="small" />
                        </IconButton>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Prior Weaver
                        </Typography>
                    </Box>
                    <IconButton onClick={toggleCollapseAll}>
                        {!openSlides ? <KeyboardDoubleArrowDown /> : <KeyboardDoubleArrowUp />}
                    </IconButton>
                </Box>
                <Divider />

                <List>
                    {/* Slides Section */}
                    <ListItem disablePadding sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <ListItemButton>
                            <ListItemText
                                primary="Slides"
                                primaryTypographyProps={{ fontWeight: 'bold' }}
                            />
                        </ListItemButton>
                        <IconButton onClick={toggleCollapseAll}>
                            {openSlides ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    </ListItem>
                    <Collapse in={openSlides} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {SLIDES.map((slide, index) => (
                                <ListItem key={index} disablePadding>
                                    <ListItemButton
                                        sx={{ 
                                            pl: 4,
                                            backgroundColor: activeSlideSection === index ? 'rgba(0, 0, 0, 0.08)' : 'transparent'
                                        }}
                                        onClick={() => handleSlideClick(index)}
                                    >
                                        <ListItemText
                                            primary={(index + 1) + ". " + slide.title}
                                            sx={{
                                                '& .MuiListItemText-primary': {
                                                    fontSize: '0.875rem',
                                                }
                                            }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Collapse>
                </List>
            </Box>

            {/* Main content showing all slides */}
            <Box className="doc-content">
                {SLIDES.map((slide, index) => (
                    <Box 
                        key={index}
                        id={`slide-section-${index}`} 
                        className="space-section"
                        sx={{ mb: 6 }}
                    >
                        <Typography variant="h3" className="doc-title" sx={{ mb: 4 }}>
                            {slide.title}
                        </Typography>
                        
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: 3,
                            alignItems: 'center'
                        }}>
                            {slide.slides.map((slidePath, imgIndex) => (
                                <Box 
                                    key={imgIndex} 
                                    sx={{ 
                                        width: '100%',
                                        maxWidth: '800px',
                                    }}
                                >
                                    <img 
                                        src={process.env.PUBLIC_URL + slidePath} 
                                        alt={`Slide ${imgIndex + 1} for ${slide.title}`}
                                        style={{ 
                                            width: '100%',
                                            height: 'auto',
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                                            borderRadius: '4px'
                                        }} 
                                    />
                                </Box>
                            ))}
                        </Box>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}   