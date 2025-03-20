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

export default function NavBar() {
    const { space, feedback } = useContext(WorkspaceContext);
    const { translated } = useContext(VariableContext);
    const { currentVersion, entityHistory, finishSpecification, getUndoOperationDescription, getRedoOperationDescription, undoEntityOperation, redoEntityOperation } = useContext(EntityContext);
    const [finishSpecificationDialogOpen, setFinishSpecificationDialogOpen] = useState(false);


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
            <Button
                variant="outlined"
                color="secondary"
                startIcon={<HelpOutlineIcon />}
            >
                Tutorial
            </Button>

            {/* Middle section - Undo and Redo buttons */}
            {space === ELICITATION_SPACE.OBSERVABLE && <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title={getUndoOperationDescription()}>
                    <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<UndoIcon />}
                        onClick={undoEntityOperation}
                        disabled={currentVersion <= 0}
                    >
                        Undo
                    </Button>
                </Tooltip>
                <Tooltip title={getRedoOperationDescription()}>
                    <Button
                        variant="outlined"
                        color="primary"
                        endIcon={<RedoIcon />}
                        onClick={redoEntityOperation}
                        disabled={currentVersion >= entityHistory.length - 1}
                    >
                        Redo
                    </Button>
                </Tooltip>
            </Box>
            }

            {/* Right section - Finish button */}
            <Button
                variant="outlined"
                color="success"
                endIcon={<CheckCircleOutlineIcon />}
                onClick={() => setFinishSpecificationDialogOpen(true)}
                disabled={translated === 0}
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
                    <Button color="primary" onClick={finishSpecification}>Finish</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}