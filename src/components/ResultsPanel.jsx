import { Box, Button, CircularProgress, Snackbar, Alert, RadioGroup, FormControl, FormControlLabel, Radio, FormLabel, Checkbox } from '@mui/material';
import React, { useState, useRef, useEffect, useContext } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import "./ResultsPanel.css";
import { VariableContext } from '../contexts/VariableContext';
import { EntityContext } from '../contexts/EntityContext';
import { ELICITATION_SPACE, WorkspaceContext } from '../contexts/WorkspaceContext';

export default function ResultsPanel() {
    const { space } = useContext(WorkspaceContext);
    const { variablesDict, parametersDict, updateParameter, translationTimes, setTranslationTimes, predictiveCheckResults, setPredictiveCheckResults } = useContext(VariableContext);
    const { entities } = useContext(EntityContext);

    const [isTranslating, setIsTranslating] = useState(false);
    const [selectedPriorDistributions, setSelectedPriorDistributions] = useState({});

    const svgHeight = 250;
    const margin = { top: 10, bottom: 40, left: 40, right: 20, };
    const labelOffset = 35;

    const [showPlot, setShowPlot] = useState("both");

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    useEffect(() => {
        console.log("results panel mounted");
        if (predictiveCheckResults.length > 0) {
            plotCheckResults();
        }
    }, [predictiveCheckResults, showPlot]);

    const readyToTranslate = () => {
        if (space === ELICITATION_SPACE.OBSERVABLE) {
            const incompleteEntities = Object.values(entities).some(entity => {
                return Object.values(entity).some(value => value === null);
            });

            if (incompleteEntities) {
                setSnackbarMessage('All entities must be completed before translating');
                setSnackbarOpen(true);
                return false;
            }
        }

        if (space === ELICITATION_SPACE.PARAMETER) {
            const incompletePriors = Object.values(parametersDict).some(param => param.selectedDistributionIdx === null);

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

        if (space === ELICITATION_SPACE.OBSERVABLE) {
            axios
                .post(window.BACKEND_ADDRESS + "/translate", {
                    entities: Object.values(entities),
                    variables: Object.values(variablesDict),
                    parameters: Object.values(parametersDict),
                })
                .then((response) => {
                    console.log("translated", response.data);
                    const priorsResults = response.data.priors_results;
                    Object.entries(priorsResults).forEach(([paramName, distributions]) => {
                        updateParameter(paramName, {
                            distributions: distributions,
                            selectedDistributionIdx: 0
                        });
                    });

                    predictiveCheck(Object.values(priorsResults).map(dists => dists[0]));
                });
        }
        else if (space === ELICITATION_SPACE.PARAMETER) {
            predictiveCheck(Object.values(parametersDict).map(param => param.distributions[param.selectedDistributionIdx]));
        }
    };

    const predictiveCheck = (priors) => {
        axios
            .post(window.BACKEND_ADDRESS + "/check", {
                variables: Object.values(variablesDict),
                priors: Object.values(priors),
            })
            .then((response) => {
                console.log("predictive check", response.data);
                setIsTranslating(false);
                setTranslationTimes(prev => prev + 1);
                setPredictiveCheckResults(prev => [...prev, response.data.check_results]);
            })
    }

    const plotCheckResults = () => {
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

        const results = predictiveCheckResults[predictiveCheckResults.length - 1];
        const previousCheckResult = predictiveCheckResults.length > 1 ? predictiveCheckResults[predictiveCheckResults.length - 2] : null;
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
        if (previousCheckResult && (showPlot === "both" || showPlot === "previous")) {
            previousCheckResult["simulated_results"].forEach((simulatedData, index) => {
                chart.append('path')
                    .datum(simulatedData["kde"])
                    .attr('fill', 'none')
                    .attr('stroke', 'red')
                    .attr('stroke-width', 1)
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
                .attr("y", 25)
                .attr("text-anchor", "start")
                .style("font-size", "12px")
                .text("Previous");
        }

        if ((showPlot === "both" || showPlot === "current")) {
            const simulatedResults = results["simulated_results"];
            simulatedResults.forEach((simulatedData, index) => {
                // Plot current KDE
                chart.append('path')
                    .datum(simulatedData["kde"])
                    .attr('fill', 'none')
                    .attr('stroke', 'blue')
                    .attr('stroke-width', 1)
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
                .attr("y", 15)
                .attr("text-anchor", "start")
                .style("font-size", "12px")
                .text("Current");
        }

        // Add title
        const responseVar = Object.values(variablesDict).find(v => v.type === "response");
        chart.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + labelOffset)
            .attr('text-anchor', 'middle')
            .text(`${responseVar.name} (${responseVar.unitLabel})`);
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
                sx={{ my: 3 }}
                variant="contained"
                onClick={translate}
                disabled={(space === ELICITATION_SPACE.PARAMETER && Object.values(parametersDict).some(param => param.selectedDistributionIdx === null)) ||
                    (space === ELICITATION_SPACE.OBSERVABLE && (Object.values(entities).length === 0))}
            >
                {space === ELICITATION_SPACE.OBSERVABLE ? "Translate" : "Check"}
            </Button>
            {isTranslating && <CircularProgress sx={{ my: 2 }} />}
            {!isTranslating && translationTimes > 0 &&
                <Box className='hide-plot-box' sx={{ mb: 2 }}>
                    <FormControl sx={{ border: '1px solid #bbb', borderRadius: '8px', padding: '15px' }}>
                        <FormLabel>Show: </FormLabel>
                        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={(showPlot === "both" || showPlot === "previous")}
                                        onChange={() => {
                                            if (showPlot === "both" || showPlot === "previous") {
                                                setShowPlot("current");
                                            } else if (showPlot === "current") {
                                                setShowPlot("both");
                                            }
                                        }}
                                    />
                                }
                                label="Previous"
                            />
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={(showPlot === "both" || showPlot === "current")}
                                        onChange={() => {
                                            if (showPlot === "both" || showPlot === "current") {
                                                setShowPlot("previous");
                                            } else if (showPlot === "previous") {
                                                setShowPlot("both");
                                            }
                                        }}
                                    />
                                }
                                label="Current"
                                sx={{ mr: 2 }}
                            />
                        </Box>
                    </FormControl>
                </Box>
            }
            {!isTranslating && translationTimes > 0 && <Box sx={{ width: '100%' }} id={'predictive-check-div'}></Box>}

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