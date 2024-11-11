import React from 'react';
import { Container, Typography, Box, Button, Paper, Grid2 } from '@mui/material';

export default function Home(props) {
    return (
        <Container>
            <Box sx={{ my: 4 }}>
                <Typography variant="h2" component="h1" gutterBottom>
                    Welcome to the Prior Elicitation Tool
                </Typography>
                <Typography variant="h5" component="h2" gutterBottom>
                    A tool to assist with Bayesian prior elicitation and predictive modeling.
                </Typography>
                <Typography variant="body1" gutterBottom>
                    This tool provides various functionalities to help you fit distributions, visualize data, and manage your Bayesian models.
                </Typography>
                <Grid2 container spacing={2} sx={{ mt: 4 }}>
                    <Grid2 item xs={12} md={6}>
                        <Paper elevation={3} sx={{ p: 2 }}>
                            <Typography variant="h6" component="h3" gutterBottom>
                                Get Started
                            </Typography>
                            <Typography variant="body1" gutterBottom>
                                Begin by adding variables and fitting distributions to your data.
                            </Typography>
                            <Button variant="contained" color="primary" href="/workspace">
                                Go to Workspace
                            </Button>
                        </Paper>
                    </Grid2>
                    <Grid2 item xs={12} md={6}>
                        <Paper elevation={3} sx={{ p: 2 }}>
                            <Typography variant="h6" component="h3" gutterBottom>
                                View Logs
                            </Typography>
                            <Typography variant="body1" gutterBottom>
                                Check the logs to see the actions performed and their outcomes.
                            </Typography>
                            <Button variant="contained" color="secondary" href="/logger">
                                View Logs
                            </Button>
                        </Paper>
                    </Grid2>
                </Grid2>
            </Box>
        </Container>
    );
}