import { Box, Typography, List, ListItem, ListItemButton, ListItemText, Divider, Collapse, Button, IconButton } from "@mui/material";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import "./Doc.css";
import { ELICITATION_SPACE } from "../contexts/WorkspaceContext";
import { KeyboardDoubleArrowDown, KeyboardDoubleArrowUp, ExpandMore, ExpandLess, Home } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import routes from "../shared/routes";

export default function Doc() {
    const navigate = useNavigate();
    const [openParameter, setOpenParameter] = useState(true);
    const [openObservable, setOpenObservable] = useState(true);

    useEffect(() => {
        document.title = "Documentation";
    }, []);

    const handleSpaceClick = (space) => {
        if (space === ELICITATION_SPACE.PARAMETER) {
            setOpenParameter(true);
        } else {
            setOpenObservable(true);
        }

        const element = document.getElementById(`${space}-section`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const handleClipClick = (space, index) => {
        const element = document.getElementById(`clip-${space}-${index}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const backToHomePage = () => {
        navigate(routes.home);
    };

    const toggleCollapseAll = () => {
        if (!openParameter && !openObservable) {
            setOpenParameter(true);
            setOpenObservable(true);
        } else {
            setOpenParameter(false);
            setOpenObservable(false);
        }
    };

    const toggleCollapse = (space) => {
        if (space === ELICITATION_SPACE.PARAMETER) {
            setOpenParameter(!openParameter);
        } else {
            setOpenObservable(!openObservable);
        }
    };

    const DOC_CONTENT = {
        [ELICITATION_SPACE.PARAMETER]: {
            title: "Expressing Knowledge in the Parameter Space",
            description: "In the parameter space, you'll specify your knowledge about the **model parameters** through probability distributions. This approach directly captures your beliefs about the relationships between variables.\n\nFollow these steps to specify your knowledge:\n\n" +
                "1. **Set Variable Ranges**: Define realistic ranges for predictor and response variables\n" +
                "2. **Set Parameter Ranges**: Specify plausible ranges for model parameters\n" +
                "3. **Draw Parameter Distributions**: Sketch histograms representing your beliefs about parameter values\n" +
                "4. **Fit Probability Distributions**: Convert sketched histograms into formal probability distributions\n" +
                "5. **Validate with Prior Predictive Check**: Ensure your specifications produce reasonable predictions\n" +
                "6. **Redo Step 3-5** if the results are not satisfactory\n\n" +
                "Detailed instructions for each step are provided below.",
            clips: [
                {
                    title: "Modify the Range of Variables",
                    description: "The default ranges for each variable are from **0 to 100**, which may not be the case for your knowledge of the problem.\n\n" +
                        "- Click the 'edit' icon next to the variable name to open the variable editor.\n" +
                        "- Adjust the range (e.g. min and max) values of the variable.\n" +
                        "- Click 'Save' to save the changes.",
                },
                {
                    title: "Modify the Range of Parameters",
                    description: "The default ranges for each parameter are from **-10 to 10**, which may not be the case for your knowledge of the problem.\n\n" +
                        "- Click the 'edit' icon next to the parameter name to open the parameter editor.\n" +
                        "- Adjust the range (e.g. min and max) values of the parameter.\n" +
                        "- Click 'Save' to save the changes.",
                },
                {
                    title: "Specify the Distributions of the Parameters",
                    description: "You can specify the distributions of the parameters by drawing the shape in the histogram:\n\n" +
                        "- **Click** on a grid in the histogram to add a data point\n" +
                        "- **Click again** on the same point to remove it\n\n" +
                        "This interactive approach is based on the **roulette method** which provides an intuitive way to express your beliefs about parameter distributions.",
                    url: "https://github.com/xavier-shaw/Prior-Elicitation/raw/refs/heads/main/materials/param-roulette.mp4"
                },
                {
                    title: "Fit Continuous Distributions to the Data",
                    description: "You can fit continuous distributions to the data by clicking the 'Fit' button\n\n" +
                        "- The system will automatically fit a set of distribution families to the data.\n" +
                        "- The system will automatically select the best distribution family for the data.\n" +
                        "- You can open the dropdown menu to select the distribution family you want to use. (The distributions are listed in the order of their fitness to the data)\n",
                    url: "https://github.com/xavier-shaw/Prior-Elicitation/raw/refs/heads/main/materials/param-fit-dist.mp4"
                },
                {
                    title: "Validate your Specification with Prior Predictive Check",
                    description: "You can validate your specification with the prior predictive check:\n\n" +
                        "- **Click** on the 'Check' button to perform prior predictive check\n" +
                        "- The system will simulate a dataset from the prior distributions and uniform distributions of the predictor variables\n" +
                        "- The simulated results will be computed as the prior predictive distribution of the response variable\n" +
                        "- If the prior predictive distribution is not align with your knowledge, you can adjust the specification to improve the fit.\n\n",
                    additionalInfo: "### Quick Guide: Evaluating Prior Predictive Checks\n" +
                        "#### What is It?\n" +
                        "Simulates possible response variable values based on your specified priors.\n" +
                        "Uses a wide range of predictor values to test if your priors produce reasonable outcomes.\n" +
                        "#### How to Check the Results?\n" +
                        "- ✅**Plausibility**: Are the predicted values realistic? If not, adjust your priors.\n" +
                        "- ✅**Alignment with Expectations**: Does the shape and spread match your intuition? If it looks off, refine your priors.\n" +
                        "- ✅**Uncertainty Balance**: Are predictions too narrow (overconfident) or too wide (too vague)? Adjust priors if needed.\n" +
                        "- ✅**Trends & Biases**: Do results show strange patterns? If unexpected, revisit your priors or predictor assumptions.\n" +
                        "#### If Results Look Wrong:\n" +
                        "- **Adjust priors** (too strong or weak?)\n" +
                        "- **Reconsider expectations** (realistic assumptions?)\n" +
                        "- **Check predictor specifications** (range too broad or restrictive?)\n" +
                        "#### Final Tip:\n" +
                        "**The goal isn't a perfect match to your expectations but to avoid contradictions with domain knowledge. If in doubt, refine and recheck!**",
                    url: "https://github.com/xavier-shaw/Prior-Elicitation/raw/refs/heads/main/materials/param-predictive-check.mp4"
                }
            ]
        },
        [ELICITATION_SPACE.OBSERVABLE]: {
            title: "Expressing Knowledge in the Observable Space",
            description: "In the observable space, the knowledge you need to specify is about the *distributions* of the `variables` and their *relationships*. This approach captures your knowledge about the distributions of variables and the relationships between them.\n\n" +
                "Follow these steps to specify your knowledge:\n\n" +
                "1. **Modify the Range of Variables**\n" +
                "2. **Specify Knowledge About Variables** (Option 1):\n" +
                "   - Specify the Distributions of Variables\n" +
                "   - Link Data in the Parallel Coordinates Plot\n" +
                "3. **Specify Knowledge About Variables** (Option 2):\n" +
                "   - Generate Data Directly in the Parallel Coordinates Plot\n" +
                "4. **Brushing in Multi-view**\n" +
                "5. **Validate your Specification with Prior Predictive Check**\n" +
                "6. **Redo Step 2-5** if the results are not satisfactory\n\n" +
                "Detailed instructions for each step are provided below.",
            clips: [
                {
                    title: "Modify the Range of Variables",
                    description: "The default ranges for each variable are from **0 to 100**, which may not be the case for your knowledge of the problem.\n\n" +
                        "You can modify the range of each variable by:\n" +
                        "1. Clicking and dragging the **range handler** on the axes in the parallel coordinates plot\n" +
                        "2. Adjusting the upper and lower bounds to values that make sense for your data\n\n" +
                        "You can also click the 'edit' icon next to the variable name to open the variable editor and modify the range.",
                    url: "https://github.com/xavier-shaw/Prior-Elicitation/raw/refs/heads/main/materials/range-handle.mp4"
                },
                {
                    title: "Specify the Distributions of the Variables",
                    description: "You can specify the distributions of the variables by drawing the shape in the histogram:\n\n" +
                        "- **Click** on a grid in the histogram to add a data point\n" +
                        "- **Click again** on the same point to remove it\n\n" +
                        "This interactive approach is based on the **roulette method** which provides an intuitive way to express your beliefs about variable distributions.",
                    url: "https://github.com/xavier-shaw/Prior-Elicitation/raw/refs/heads/main/materials/roulette.mp4"
                },
                {
                    title: "Linking Data in the Parallel Coordinates Plot",
                    description: "Once you've specified variable distributions, data points appear on the parallel coordinates plot. To establish relationships between variables, follow these steps:\n\n" +
                        "1. Click the **Start Linking** button\n" +
                        "2. Select the first group of data points\n" +
                        "3. Click **Confirm Group 1** button\n" +
                        "4. Select the second group of data points\n" +
                        "5. Click **Confirm Group 2** button\n" +
                        "6. Click **Link** to connect these groups\n\n" +
                        "This allows you to specify relationships between variables.",
                    url: "https://github.com/xavier-shaw/Prior-Elicitation/raw/refs/heads/main/materials/linking.mp4"
                },
                {
                    title: "Generate Data in the Parallel Coordinates Plot",
                    description: "You can also directly generate synthetic data points that match your knowledge:\n\n" +
                        "- Specify the number of points you want to generate (default=5)\n" +
                        "- Select the region of interest in the parallel coordinates plot\n" +
                        "- Click the **Generate** button\n" +
                        "- Our system will generate points that randomly fall into the selected region\n\n" +
                        "This allows you to directly generate data points with certain relationships across variables.",
                    url: "https://github.com/xavier-shaw/Prior-Elicitation/raw/refs/heads/main/materials/generate.mp4"
                },
                {
                    title: "Brushing in Multi-view",
                    description: "The brushing technique enables interactive exploration across multiple linked visualizations:\n\n" +
                        "- **Click and drag** in *Parallel Coordinates Plot* or *Bivariate Scatter Plot* to select a subset of data\n" +
                        "- Selected data is *highlighted across all views*\n" +
                        "- This reveals how data points in one distribution relate to others\n\n" +
                        "This is useful for understanding the relationships between variables.",
                    url: "https://github.com/xavier-shaw/Prior-Elicitation/raw/refs/heads/main/materials/brushing.mp4"
                },
                {
                    title: "Validate your Specification with Prior Predictive Check",
                    description: "You can validate your specification with the prior predictive check:\n\n" +
                        "- **Click** on the 'Translate' button to translate the observable specifications to the prior distributions\n" +
                        "- The system will simulate a dataset from the prior distributions and uniform distributions of the predictor variables\n" +
                        "- The simulated results will be computed as the prior predictive distribution of the response variable\n" +
                        "- If the prior predictive distribution is not align with your knowledge, you can adjust the specification to improve the fit.\n\n",
                    additionalInfo: "### Quick Guide: Evaluating Prior Predictive Checks\n" +
                        "#### What is It?\n" +
                        "Simulates possible response variable values based on your specified priors.\n" +
                        "Uses a wide range of predictor values to test if your priors produce reasonable outcomes.\n" +
                        "#### How to Check the Results?\n" +
                        "- ✅**Plausibility**: Are the predicted values realistic? If not, adjust your priors.\n" +
                        "- ✅**Alignment with Expectations**: Does the shape and spread match your intuition? If it looks off, refine your priors.\n" +
                        "- ✅**Uncertainty Balance**: Are predictions too narrow (overconfident) or too wide (too vague)? Adjust priors if needed.\n" +
                        "- ✅**Trends & Biases**: Do results show strange patterns? If unexpected, revisit your priors or predictor assumptions.\n" +
                        "#### If Results Look Wrong:\n" +
                        "- **Adjust priors** (too strong or weak?)\n" +
                        "- **Reconsider expectations** (realistic assumptions?)\n" +
                        "- **Check predictor specifications** (range too broad or restrictive?)\n" +
                        "#### Final Tip:\n" +
                        "**The goal isn't a perfect match to your expectations but to avoid contradictions with domain knowledge. If in doubt, refine and recheck!**",
                    url: "https://github.com/xavier-shaw/Prior-Elicitation/raw/refs/heads/main/materials/observable-predictive-check.mp4"
                }
            ]
        }
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
                        {!openParameter && !openObservable ? <KeyboardDoubleArrowDown /> : <KeyboardDoubleArrowUp />}
                    </IconButton>
                </Box>
                <Divider />

                <List>
                    {/* Parameter Space Section */}
                    <ListItem disablePadding sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <ListItemButton
                            onClick={() => handleSpaceClick(ELICITATION_SPACE.PARAMETER)}
                        >
                            <ListItemText
                                primary="Parameter Space"
                                primaryTypographyProps={{ fontWeight: 'bold' }}
                            />
                        </ListItemButton>
                        <IconButton onClick={() => toggleCollapse(ELICITATION_SPACE.PARAMETER)}>
                            {openParameter ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    </ListItem>
                    <Collapse in={openParameter} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {DOC_CONTENT[ELICITATION_SPACE.PARAMETER].clips.map((clip, index) => (
                                <ListItem key={index} disablePadding>
                                    <ListItemButton
                                        sx={{ pl: 4 }}
                                        onClick={() => handleClipClick(ELICITATION_SPACE.PARAMETER, index)}
                                    >
                                        <ListItemText
                                            primary={(index + 1) + ". " + clip.title}
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

                    {/* Observable Space Section */}
                    <ListItem disablePadding sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <ListItemButton
                            onClick={() => handleSpaceClick(ELICITATION_SPACE.OBSERVABLE)}
                        >
                            <ListItemText
                                primary="Observable Space"
                                primaryTypographyProps={{ fontWeight: 'bold' }}
                            />
                        </ListItemButton>
                        <IconButton onClick={() => toggleCollapse(ELICITATION_SPACE.OBSERVABLE)}>
                            {openObservable ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    </ListItem>
                    <Collapse in={openObservable} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding>
                            {DOC_CONTENT[ELICITATION_SPACE.OBSERVABLE].clips.map((clip, index) => (
                                <ListItem key={index} disablePadding>
                                    <ListItemButton
                                        sx={{ pl: 4 }}
                                        onClick={() => handleClipClick(ELICITATION_SPACE.OBSERVABLE, index)}
                                    >
                                        <ListItemText
                                            primary={(index + 1) + ". " + clip.title}
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

            {/* Main content showing both spaces */}
            <Box className="doc-content">
                {/* Parameter Space Content */}
                <Box id={`${ELICITATION_SPACE.PARAMETER}-section`} className="space-section">
                    <Typography variant="h3" className="doc-title">
                        {DOC_CONTENT[ELICITATION_SPACE.PARAMETER]?.title}
                    </Typography>
                    <Box>
                        <ReactMarkdown>
                            {DOC_CONTENT[ELICITATION_SPACE.PARAMETER]?.description}
                        </ReactMarkdown>
                    </Box>

                    {DOC_CONTENT[ELICITATION_SPACE.PARAMETER]?.clips?.map((clip, index) => (
                        <Box
                            key={index}
                            id={`clip-${ELICITATION_SPACE.PARAMETER}-${index}`}
                            className="clip-box"
                        >
                            <Typography variant="h5" className="clip-title">{index + 1}. {clip.title}</Typography>
                            <Box className="clip-description">
                                <ReactMarkdown>{clip.description}</ReactMarkdown>
                            </Box>
                            {clip.url && <video
                                className="clip-box-video"
                                src={clip.url}
                                autoPlay
                                loop
                                muted
                                playsInline
                                onLoadedMetadata={(e) => {
                                    e.target.playbackRate = 1.2;
                                }}
                            ></video>}
                            {clip.additionalInfo && <Box className="clip-description">
                                <ReactMarkdown>{clip.additionalInfo}</ReactMarkdown>
                            </Box>}
                        </Box>
                    ))}
                </Box>

                <Divider sx={{ my: 6 }} />

                {/* Observable Space Content */}
                <Box id={`${ELICITATION_SPACE.OBSERVABLE}-section`} className="space-section">
                    <Typography variant="h3" className="doc-title">
                        {DOC_CONTENT[ELICITATION_SPACE.OBSERVABLE]?.title}
                    </Typography>
                    <Box>
                        <ReactMarkdown>
                            {DOC_CONTENT[ELICITATION_SPACE.OBSERVABLE]?.description}
                        </ReactMarkdown>
                    </Box>

                    {DOC_CONTENT[ELICITATION_SPACE.OBSERVABLE]?.clips?.map((clip, index) => (
                        <Box
                            key={index}
                            id={`clip-${ELICITATION_SPACE.OBSERVABLE}-${index}`}
                            className="clip-box"
                        >
                            <Typography variant="h5" className="clip-title">{index + 1}. {clip.title}</Typography>
                            <Box className="clip-description">
                                <ReactMarkdown>{clip.description}</ReactMarkdown>
                            </Box>
                            {clip.url && <video
                                className="clip-box-video"
                                src={clip.url}
                                autoPlay
                                loop
                                muted
                                playsInline
                                onLoadedMetadata={(e) => {
                                    e.target.playbackRate = 1.2;
                                }}
                            ></video>}
                            {clip.additionalInfo && <Box className="clip-description">
                                <ReactMarkdown>{clip.additionalInfo}</ReactMarkdown>
                            </Box>}
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
}   