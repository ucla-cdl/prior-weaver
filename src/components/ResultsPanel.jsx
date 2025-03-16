import { Box, Button, CircularProgress, FormControl, Grid2, IconButton, InputLabel, MenuItem, Select, Slider, Snackbar, Alert } from '@mui/material';
import React, { useState, useRef, useEffect, useContext } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import "./ResultsPanel.css";
import { VariableContext } from '../contexts/VariableContext';
import { EntityContext } from '../contexts/EntityContext';
import { PriorContext } from '../contexts/PriorContext';
import { CONDITIONS, WorkspaceContext } from '../contexts/WorkspaceContext';

export default function ResultsPanel() {
    const { condition } = useContext(WorkspaceContext);
    const { variablesDict, parametersDict } = useContext(VariableContext);
    const { entities } = useContext(EntityContext);
    const { priorsDict, setPriorsDict } = useContext(PriorContext);

    const [isTranslating, setIsTranslating] = useState(false);
    const [translated, setTranslated] = useState(0);

    const [selectedPriorDistributions, setSelectedPriorDistributions] = useState({});

    const [previousCheckResult, setPreviousCheckResult] = useState(null);

    const svgHeight = 250;
    const margin = { top: 10, bottom: 40, left: 40, right: 20, };
    const labelOffset = 35;

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    // useEffect(() => {
    //     if (translated > 0) {
    //         plotPriorsResults(priorsDict);
    //     }
    // }, [translated]);

    /**
     * Update the plot and prior distriburions when the selected distribution changes
     */
    // useEffect(() => {
    //     if (translated > 0) {
    //         // Update the appearance of the selected distribution
    //         // Object.entries(priorsDict).forEach(([priorName, prior]) => {
    //         //     plotFittedDistribution(priorName, prior);
    //         // });

    //         // Perform prior predictive check
    //         predictiveCheck();
    //     }
    // }, [priorsDict]);

    const readyToTranslate = () => {
        if (condition === CONDITIONS.OBSERVABLE) {
            const incompleteEntities = Object.values(entities).some(entity => {
                return Object.values(entity).some(value => value === null);
            });

            if (incompleteEntities) {
                setSnackbarMessage('All entities must be completed before translating');
                setSnackbarOpen(true);
                return false;
            }
        }

        if (condition === CONDITIONS.PARAMETER) {
            const incompletePriors = Object.values(priorsDict).length !== Object.values(parametersDict).length;

            if (incompletePriors) {
                setSnackbarMessage('All priors must be completed before translating');
                setSnackbarOpen(true);
                return false;
            }
        }

        return true;
    };

    const translate = () => {
        if (!readyToTranslate()) {
            return;
        }

        setIsTranslating(true);

        if (condition === CONDITIONS.OBSERVABLE) {
            axios
                .post(window.BACKEND_ADDRESS + "/translate", {
                    entities: Object.values(entities),
                    variables: Object.values(variablesDict),
                    parameters: Object.values(parametersDict),
                })
                .then((response) => {
                    console.log("translated", response.data);
                    setPriorsDict(response.data.priors_results);
                    predictiveCheck(response.data.priors_results);
                });
        }
        else if (condition === CONDITIONS.PARAMETER) {
            predictiveCheck(priorsDict);
        }

        setIsTranslating(false);
        setTranslated(prev => prev + 1);
    };

    const predictiveCheck = (priors) => {
        axios
            .post(window.BACKEND_ADDRESS + "/check", {
                variables: Object.values(variablesDict),
                priors: Object.values(priors),
            })
            .then((response) => {
                console.log("predictive check", response.data);
                plotCheckResults(response.data.check_results);
            });
    }

    const plotPriorsResults = () => {
        Object.entries(priorsDict).forEach(([paramName, priorResult], index) => {
            const container = d3.select(`#parameter-div-${paramName}`);
            container.html('');

            const svgWidth = d3.select(`#predictive-check-div`).node().clientWidth;
            container.append('svg')
                .attr('id', `parameter-svg-${paramName}`)
                .attr('width', svgWidth)
                .attr('height', svgHeight);
        });
    }

    const plotCheckResults = (results) => {
        /**
         * Plot the predictive check for the simulated dataset
         * 
         * simulated dataset: [
         * { 
         *  params: [p1, p2, p3],
         *  dataset: [{age: 20, education: 12, income: 1000}, {...}, ...]
         * }, 
         * {
         *  ...
         * },
         * ...
         * ]
         */

        const containerDiv = d3.select('#predictive-check-div');
        containerDiv.html('');

        const svgWidth = containerDiv.node().clientWidth;
        const svg = containerDiv
            .append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight);

        const chartWidth = svgWidth - margin.left - margin.right;
        const chartHeight = svgHeight - margin.top - margin.bottom;
        const chart = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const simulatedResults = results["simulated_results"];
        const minX = previousCheckResult ? Math.min(previousCheckResult["min_response_val"], results["min_response_val"]) : results["min_response_val"]
        const maxX = previousCheckResult ? Math.max(previousCheckResult["max_response_val"], results["max_response_val"]) : results["max_response_val"]
        const maxY = previousCheckResult ? Math.max(previousCheckResult["max_density_val"], results["max_density_val"]) : results["max_density_val"]

        const x = d3.scaleLinear()
            .domain([minX, maxX])
            .nice()
            .range([0, chartWidth]);

        const yKDE = d3.scaleLinear()
            .domain([0, maxY])
            .nice()
            .range([chartHeight, 0]);

        // Create the x-axis
        chart.append('g')
            .attr('transform', `translate(0, ${chartHeight})`)
            .call(d3.axisBottom(x));

        // Create the y-axis for the kde
        chart.append('g')
            .call(d3.axisLeft(yKDE));

        // Plot previous KDE if it exists
        if (previousCheckResult) {
            previousCheckResult["simulated_results"].forEach((simulatedData, index) => {
                chart.append('path')
                    .datum(simulatedData["kde"])
                    .attr('fill', 'none')
                    .attr('stroke', 'red')
                    .attr('stroke-width', 0.5)
                    .attr('d', d3.line()
                        .x(d => x(d.x))
                        .y(d => yKDE(d.density)));
            });

            // Add legend for previous results
            chart.append("rect")
                .attr("x", chartWidth - 50)
                .attr("y", 20)
                .attr("width", 15)
                .attr("height", 2)
                .attr("fill", "red");

            chart.append("text")
                .attr("x", chartWidth - 30)
                .attr("y", 20)
                .attr("text-anchor", "start")
                .style("font-size", "12px")
                .text("Previous");
        }

        simulatedResults.forEach((simulatedData, index) => {
            // Plot current KDE
            chart.append('path')
                .datum(simulatedData["kde"])
                .attr('fill', 'none')
                .attr('stroke', 'blue')
                .attr('stroke-width', 0.5)
                .attr('d', d3.line()
                    .x(d => x(d.x))
                    .y(d => yKDE(d.density)));
        });

        // Add legend for current results
        chart.append("rect")
            .attr("x", chartWidth - 50)
            .attr("y", 10)
            .attr("width", 15)
            .attr("height", 2)
            .attr("fill", "blue");

        chart.append("text")
            .attr("x", chartWidth - 30)
            .attr("y", 10)
            .attr("text-anchor", "start")
            .style("font-size", "12px")
            .text("Current");

        // Add title
        const responseVar = Object.values(variablesDict).find(v => v.type === "response");
        chart.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + labelOffset)
            .attr('text-anchor', 'middle')
            .text(`${responseVar.name} (${responseVar.unitLabel})`);

        // Store current results 
        setPreviousCheckResult(results);
    }

    const updateSelectedPriorDistribution = (paramName, paramKey, newValue) => {
        const updatedParams = { ...selectedPriorDistributions[paramName].params, [paramKey]: newValue };
        console.log("update", selectedPriorDistributions[paramName], updatedParams);

        axios
            .post(window.BACKEND_ADDRESS + "/updateDist", {
                dist: selectedPriorDistributions[paramName],
                params: updatedParams,
            })
            .then((response) => {
                setSelectedPriorDistributions(prev => {
                    const updatedDist = { ...prev[paramName], params: updatedParams, p: response.data.p };
                    return { ...prev, [paramName]: updatedDist };
                });
            });
    }

    return (
        <Box id='results-panel' sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <Button
                sx={{ my: 1 }}
                variant="contained"
                onClick={translate}
                disabled={(condition === CONDITIONS.PARAMETER && Object.values(priorsDict).length === 0) ||
                    (condition === CONDITIONS.OBSERVABLE && Object.values(entities).length === 0)}
            >
                Translate
            </Button>
            {isTranslating && <CircularProgress sx={{ my: 2 }} />}
            {!isTranslating && translated > 0 &&
                <Box sx={{ width: '100%' }}>
                    <Box sx={{ width: "100%", borderBottom: '1px solid #ccc', pb: 1 }}>
                        <h4>Prior Predictive Check Result</h4>
                        <Box sx={{ width: '100%' }} id={'predictive-check-div'}></Box>
                    </Box>
                </Box>
            }
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    severity="error"
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    )
};