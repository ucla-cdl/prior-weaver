import React, { useContext, useEffect, useState } from 'react';
import { Box, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Button, Typography, Snackbar, Alert, Select, MenuItem } from '@mui/material';
import { TASK_SETTINGS, ELICITATION_SPACE, FEEDBACK_MODE, WorkspaceContext } from '../contexts/WorkspaceContext';
import axios from 'axios';

const Admin = () => {
    const { taskId, space, feedback, setTaskId, setSpace, setFeedback, loadRecord, setLoadRecord } = useContext(WorkspaceContext);
    const [notification, setNotification] = useState(null);
    const [records, setRecords] = useState([]);
    const [selectedRecordName, setSelectedRecordName] = useState("");

    useEffect(() => {
        document.title = "Admin";
        axios.get(window.BACKEND_ADDRESS + '/getRecords')
            .then((res) => {
                console.log(res);
                setRecords(res.data?.records);
            })
            .catch((error) => {
                setNotification("Error loading records: " + error.response.data.detail);
            });
    }, []);

    useEffect(() => {
        if (selectedRecordName) {
            const record = records.find((record) => record.name === selectedRecordName);
            setTaskId(record.taskId);
            setSpace(record.space);
            setFeedback(record.feedback);
        }
    }, [selectedRecordName]);

    const handleSaveSettings = () => {
        axios
            .post(window.BACKEND_ADDRESS + '/admin/study-settings', {
                task_id: taskId,
                elicitation_space: space,
                feedback_mode: feedback,
                load_record: loadRecord,
                record_name: selectedRecordName
            })
            .then(() => {
                setNotification("Settings saved successfully!");
            })
            .catch((error) => {
                setNotification("Error saving settings: " + error.response.data.detail);
            });
    }

    const handleChangeLoadRecord = (e) => {
        setLoadRecord(e.target.value === "true");
    }

    return (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, p: 3 }}>
            <Typography variant="h4">Study Settings</Typography>
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 2 }}>
                {/* Load Record */}
                <FormControl
                    sx={{
                        position: 'relative',
                        border: '1px solid rgba(0, 0, 0, 0.23)',
                        borderRadius: '2px',
                        p: 2
                    }}
                >
                    <FormLabel id="demo-row-radio-buttons-group-label">Load Record</FormLabel>
                    <RadioGroup
                        row
                        aria-labelledby="demo-row-radio-buttons-group-label"
                        name="row-radio-buttons-group"
                        value={loadRecord}
                        onChange={handleChangeLoadRecord}
                    >
                        <FormControlLabel value={true} control={<Radio />} label="Yes" />
                        <FormControlLabel value={false} control={<Radio />} label="No" />
                    </RadioGroup>
                </FormControl>
                {/* Record List */}
                <FormControl
                    sx={{
                        position: 'relative',
                        border: '1px solid rgba(0, 0, 0, 0.23)',
                        borderRadius: '2px',
                        p: 2
                    }}
                >
                    <FormLabel id="demo-row-radio-buttons-group-label">Record List</FormLabel>
                    <Select
                        value={selectedRecordName}
                        onChange={(e) => setSelectedRecordName(e.target.value)}
                        disabled={!loadRecord}
                    >
                        {records.map((record) => (
                            <MenuItem key={record.name} value={record.name}>{record.name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Task */}
            <FormControl
                sx={{
                    position: 'relative',
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    borderRadius: '2px',
                    p: 2
                }}
            >
                <FormLabel id="demo-row-radio-buttons-group-label">Task</FormLabel>
                <RadioGroup
                    row
                    aria-labelledby="demo-row-radio-buttons-group-label"
                    name="row-radio-buttons-group"
                    value={taskId}
                    onChange={(e) => setTaskId(e.target.value)}
                >
                    {Object.values(TASK_SETTINGS).map((t) => (
                        <FormControlLabel key={t.id} value={t.id} control={<Radio />} label={t.name} disabled={loadRecord} />
                    ))}
                </RadioGroup>
            </FormControl>

            {/* Conditions */}
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'center', gap: 2 }}>
                {/* Elicitation Space */}
                <FormControl
                    sx={{
                        position: 'relative',
                        border: '1px solid rgba(0, 0, 0, 0.23)',
                        borderRadius: '2px',
                        p: 2
                    }}
                >
                    <FormLabel id="demo-row-radio-buttons-group-label">Elicitation Space</FormLabel>
                    <RadioGroup
                        row
                        aria-labelledby="demo-row-radio-buttons-group-label"
                        name="row-radio-buttons-group"
                        value={space}
                        onChange={(e) => setSpace(e.target.value)}
                    >
                        {Object.values(ELICITATION_SPACE).map((space) => (
                            <FormControlLabel key={space} value={space} control={<Radio />} label={space} disabled={loadRecord} />
                        ))}
                    </RadioGroup>
                </FormControl>
                {/* Feedback Mode */}
                <FormControl
                    sx={{
                        position: 'relative',
                        border: '1px solid rgba(0, 0, 0, 0.23)',
                        borderRadius: '2px',
                        p: 2
                    }}
                >
                    <FormLabel id="demo-row-radio-buttons-group-label">Feedback Mode</FormLabel>
                    <RadioGroup
                        row
                        aria-labelledby="demo-row-radio-buttons-group-label"
                        name="row-radio-buttons-group"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                    >
                        {Object.values(FEEDBACK_MODE).map((feedback) => (
                            <FormControlLabel key={feedback} value={feedback} control={<Radio />} label={feedback} disabled={loadRecord} />
                        ))}
                    </RadioGroup>
                </FormControl>
            </Box>

            <Button variant="contained" color="primary" onClick={handleSaveSettings}>Save Settings</Button>
            <Snackbar
                open={Boolean(notification)}
                autoHideDuration={3000}
                onClose={() => setNotification(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setNotification(null)} severity="success">
                    Settings saved successfully!
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Admin;