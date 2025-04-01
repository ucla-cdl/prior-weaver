import { useContext, useState } from 'react';
import { Box, IconButton, Typography, Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Menu, MenuItem, Divider } from '@mui/material';
import { ELICITATION_SPACE, FEEDBACK_MODE, USER_MODE, WorkspaceContext } from '../contexts/WorkspaceContext';
import { EntityContext } from '../contexts/EntityContext';
import { VariableContext } from '../contexts/VariableContext';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BookIcon from '@mui/icons-material/Book';
import { useNavigate } from 'react-router-dom';
import routes from '../shared/routes';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Brightness1 } from '@mui/icons-material';

const TASKS = {
    [ELICITATION_SPACE.OBSERVABLE]: [
        "The population is aging, so Age distribution should have a mean around 45 and be right-skewed.",
        "Younger generations are more likely to attain higher education due to advancements in the education system.",
        "Higher education levels are less common, so Education Years may follow a left-skewed distribution, with most people having 12-16 years of education.",
        "Individuals in their 40s with higher education are likely to have the highest incomes.",
        "Income distribution is typically right-skewed, with a long tail for high earners due to wealth inequality.",
    ],
    [ELICITATION_SPACE.PARAMETER]: [
        "The effect of age on income may vary, suggesting the age coefficient should have moderate uncertainty, modeled with a normal distribution.",
        "Education has a positive impact on income, so the coefficient for Education Years should have a high positive mean.",
        "The intercept (baseline income) should be positive, reflecting a minimum expected income even for individuals with no education or work experience."
    ]
}

const GUIDELINES = {
    [ELICITATION_SPACE.OBSERVABLE]: [
        {
            title: "Define Variable Ranges",
            description: "Set realistic ranges for both predictor and response variables based on domain knowledge."
        },
        {
            title: "Express Knowledge about Variable",
            description: "- Drawing on histograms to express your distributional knowledge about variables." + "\n" + "- Exploring and Creating data patterns on Scatterplot and Parallel Coordinates Plot to express your relational knowledge about variables."
        },
        {
            title: "Translate Knowledge to Prior Distributions",
            description: "Transform your expressed knowledge into formal probability distributions (i.e., prior distribution choices)."
        },
        {
            title: "Decide Prior Distribution Choice",
            description: "Perform a prior predictive checking to assess whether the results align with your domain knowledge, and choose the most suitable priors."
        },
        {
            title: "Refine the Priors",
            description: "If the results are not satisfactory, revisit steps 1-5 and adjust the priors as needed."
        }
    ],
    [ELICITATION_SPACE.PARAMETER]: [
        {
            title: "Define Variable and Parameter Ranges",
            description: "Set realistic ranges for both model variables and model parameters based on domain knowledge."
        },
        {
            title: "Express Knowledge about Parameters",
            description: "Draw on the histograms to express your beliefs about the parameter values."
        },
        {
            title: "Translate Knowledge to Prior Distributions",
            description: "Fit the sketched histograms into formal probability distributions (i.e., prior distribution choices)."
        },
        {
            title: "Decide Prior Distribution Choice",
            description: "Perform a prior predictive checking to assess whether the results align with your domain knowledge, and choose the most suitable priors."
        },
        {
            title: "Refine the Priors",
            description: "If the results are not satisfactory, revisit steps 1-4 and adjust the priors as needed."
        }
    ]
}

export default function NavBar() {
    const { space, feedback, setTutorial, setRunTutorial, userMode } = useContext(WorkspaceContext);
    const { translationTimes } = useContext(VariableContext);
    const { currentVersion, entityHistory, finishSpecification, getUndoOperationDescription, getRedoOperationDescription, undoEntityOperation, redoEntityOperation } = useContext(EntityContext);
    const [finishSpecificationDialogOpen, setFinishSpecificationDialogOpen] = useState(false);
    const [taskMenuAnchor, setTaskMenuAnchor] = useState(null);
    const [guideMenuAnchor, setGuideMenuAnchor] = useState(null);
    const navigate = useNavigate();

    const handleClickDoc = () => {
        window.open('#/doc', '_blank');
    }

    const handleClickUITour = () => {
        setTutorial(true);
        setRunTutorial(true);
    }

    const handleConfirmFinish = () => {
        finishSpecification();
        if (userMode === USER_MODE.STUDY) {
            setFinishSpecificationDialogOpen(false);
            window.open(window.POST_TASK_SURVEY_URL);
        }
        else {
            sessionStorage.setItem('needReload', true);
            navigate(routes.home);
        }
    }

    return (
        <Box sx={{
            height: '5vh',
            width: '100%',
            backgroundColor: 'white',
            borderBottom: '1px solid #ddd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            px: 2
        }}>
            {/* Left section - Tutorial button */}
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                <Brightness1 sx={{ color: userMode === USER_MODE.STUDY ? 'green' : 'purple' }} />
                <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<BookIcon />}
                    onClick={handleClickDoc}
                >
                    Doc
                </Button>
                {/* <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<HelpOutlineIcon />}
                    onClick={handleClickUITour}
                >
                    UI Tour
                </Button> */}
                <Button
                    variant={guideMenuAnchor ? "contained" : "outlined"}
                    color="success"
                    startIcon={<HelpOutlineIcon />}
                    onClick={(e) => setGuideMenuAnchor(e.currentTarget)}
                    endIcon={guideMenuAnchor ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                >
                    Guide
                </Button>
                {/* Guide Menu */}
                <Menu
                    anchorEl={guideMenuAnchor}
                    open={Boolean(guideMenuAnchor)}
                    onClose={() => setGuideMenuAnchor(null)}
                >
                    {Object.entries(GUIDELINES[space]).map(([idx, guide], index) => (
                        <MenuItem sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxWidth: '400px', alignItems: 'flex-start' }} key={index} onClick={() => setGuideMenuAnchor(null)}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', whiteSpace: 'normal', wordWrap: 'break-word' }}>{index + 1}. {guide.title}</Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-line', wordWrap: 'break-word' }}>{guide.description}</Typography>
                        </MenuItem>
                    ))}
                </Menu>
                {userMode === USER_MODE.EXAMPLE &&
                    <Button
                        variant={taskMenuAnchor ? "contained" : "outlined"}
                        color="primary"
                        onClick={(e) => setTaskMenuAnchor(e.currentTarget)}
                        endIcon={taskMenuAnchor ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    >
                        Task
                    </Button>
                }
                {/* Task Menu */}
                <Menu
                    anchorEl={taskMenuAnchor}
                    open={Boolean(taskMenuAnchor)}
                    onClose={() => setTaskMenuAnchor(null)}
                >
                    {Object.entries(TASKS[space]).map(([task, description], index) => (
                        <MenuItem sx={{ maxWidth: '400px' }} key={index} onClick={() => setTaskMenuAnchor(null)}>
                            <Typography variant="body1" sx={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>{index + 1}. {description}</Typography>
                        </MenuItem>
                    ))}
                </Menu>
            </Box>

            {/* Middle section - Undo and Redo buttons */}
            {space === ELICITATION_SPACE.OBSERVABLE &&
                <Box className="version-operation-container" sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title={getUndoOperationDescription()}>
                        <span>
                            <Button
                                variant="outlined"
                                color="primary"
                                startIcon={<UndoIcon />}
                                onClick={undoEntityOperation}
                                disabled={currentVersion <= 0}
                            >
                                Undo
                            </Button>
                        </span>
                    </Tooltip>
                    <Tooltip title={getRedoOperationDescription()}>
                        <span>
                            <Button
                                variant="outlined"
                                color="primary"
                                endIcon={<RedoIcon />}
                                onClick={redoEntityOperation}
                                disabled={currentVersion >= entityHistory.length - 1}
                            >
                                Redo
                            </Button>
                        </span>
                    </Tooltip>
                </Box>
            }

            {/* Right section - Finish button */}
            <Button
                className='finish-button'
                variant="outlined"
                color="success"
                endIcon={<CheckCircleOutlineIcon />}
                onClick={() => setFinishSpecificationDialogOpen(true)}
                disabled={translationTimes === 0 && feedback === FEEDBACK_MODE.FEEDBACK}
            >
                Finish
            </Button>

            <Dialog open={finishSpecificationDialogOpen} onClose={() => setFinishSpecificationDialogOpen(false)}>
                <DialogTitle>Ready to Finish Prior Specification?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Please review your specifications. If you are satisfied with the results, click "Finish" to complete the specification.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button color="error" onClick={() => setFinishSpecificationDialogOpen(false)}>Cancel</Button>
                    <Button color="primary" onClick={handleConfirmFinish}>Finish</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}