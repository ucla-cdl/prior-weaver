import { useContext, useState } from 'react';
import { Box, IconButton, Typography, Tooltip, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { ELICITATION_SPACE, FEEDBACK_MODE, WorkspaceContext } from '../contexts/WorkspaceContext';
import { EntityContext } from '../contexts/EntityContext';
import { VariableContext } from '../contexts/VariableContext';
// Import necessary icons
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BookIcon from '@mui/icons-material/Book';
export default function NavBar() {
    const { space, feedback, setTutorial, setRunTutorial } = useContext(WorkspaceContext);
    const { translationTimes } = useContext(VariableContext);
    const { currentVersion, entityHistory, finishSpecification, getUndoOperationDescription, getRedoOperationDescription, undoEntityOperation, redoEntityOperation } = useContext(EntityContext);
    const [finishSpecificationDialogOpen, setFinishSpecificationDialogOpen] = useState(false);


    const handleClickDoc = () => {
        window.open('#/doc', '_blank');
    }

    const handleClickUITour = () => {
        setTutorial(true);
        setRunTutorial(true);
    }

    const handleConfirmFinish = () => {
        finishSpecification();
        setFinishSpecificationDialogOpen(false);
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
                <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<BookIcon />}
                    onClick={handleClickDoc}
                >
                    Doc
                </Button>
                <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<HelpOutlineIcon />}
                    onClick={handleClickUITour}
                >
                    UI Tour
                </Button>
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