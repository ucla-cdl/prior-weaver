import { Box, Button, CircularProgress, Snackbar, Alert, Typography, FormControl, FormLabel, FormControlLabel, Checkbox } from '@mui/material';
import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import "./ResultsPanel.css";
import { VariableContext } from '../contexts/VariableContext';
import { EntityContext } from '../contexts/EntityContext';
import { ELICITATION_SPACE, WorkspaceContext } from '../contexts/WorkspaceContext';
import { InlineMath } from 'react-katex';

const LEVELS = {
    RELATIONAL: "relational",
    DISTRIBUTIONAL: "distributional",
    UNIFORM: "uniform"
};

export default function ResultsPanel() {
    const { space } = useContext(WorkspaceContext);
    const { variablesDict, parametersDict, updateParameter, translationTimes, setTranslationTimes, predictiveCheckResults, setPredictiveCheckResults, getDistributionNotation } = useContext(VariableContext);
    const { entities, recordEntityOperation } = useContext(EntityContext);

    const [isTranslating, setIsTranslating] = useState(false);
    const [selectedPriorDistributions, setSelectedPriorDistributions] = useState({});

    const svgHeight = 300;
    const margin = { top: 30, bottom: 60, left: 60, right: 20};
    const labelOffset = 45;

    const [showPlot, setShowPlot] = useState("both");

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    const [level, setLevel] = useState(LEVELS.RELATIONAL);

    useEffect(() => {
        if (predictiveCheckResults.length > 0) {
            console.log("plotting check results", predictiveCheckResults);
            plotCheckResults();
        }
    }, [predictiveCheckResults, showPlot, level]);

    const translate = () => {
        if (space === ELICITATION_SPACE.OBSERVABLE) {
            const translationEntities = Object.values(entities).filter(entity => Object.keys(variablesDict).every(varName => entity[varName] !== null && entity[varName] !== undefined)); // allow partial translation
            if (translationEntities.length === 0) {
                setSnackbarMessage('No entities to translate');
                setSnackbarOpen(true);
                return;
            }

            setIsTranslating(true);
            axios
                .post(window.BACKEND_ADDRESS + "/translate", {
                    entities: translationEntities,
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

                    recordEntityOperation('translate', "observable", null, response.data.priors_results, `${translationTimes}`, { ...entities });
                    predictiveCheck(Object.values(priorsResults).map(dists => dists[0]));
                });
        }
        else if (space === ELICITATION_SPACE.PARAMETER) {
            const incompletePriors = Object.values(parametersDict).some(param => param.selectedDistributionIdx === null);

            if (incompletePriors) {
                setSnackbarMessage('All priors must be completed before translating');
                setSnackbarOpen(true);
                return false;
            }

            setIsTranslating(true);
            predictiveCheck(Object.values(parametersDict).map(param => param.distributions[param.selectedDistributionIdx]));
        }
    };

    const predictiveCheck = (priors) => {
        axios
            .post(window.BACKEND_ADDRESS + "/check", {
                entities: Object.values(entities),
                variables: Object.values(variablesDict),
                priors: Object.values(priors),
            })
            .then((response) => {
                console.log("predictive check", response.data);
                recordEntityOperation('check', "predictive check", null, response.data.check_results, `${translationTimes}`, { ...entities });
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

        const results = predictiveCheckResults[predictiveCheckResults.length - 1][level];
        const previousCheckResult = predictiveCheckResults.length > 1 ? predictiveCheckResults[predictiveCheckResults.length - 2][level] : null;
        if (!results && !previousCheckResult) {
            return;
        }

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
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em");

        // Create the y-axis for the kde
        chart.append('g')
            .call(d3.axisLeft(yKDE));

        // add y axis label
        chart.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -labelOffset)
            .attr('x', -chartHeight / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Density');

        // Add range indicators
        const responseVar = Object.values(variablesDict).find(v => v.type === "response");
        if (responseVar && responseVar.min !== undefined && responseVar.max !== undefined) {
            const validMin = responseVar.min;
            const validMax = responseVar.max;
            const validMinX = x(validMin);
            const validMaxX = x(validMax);

            // Add invalid range backgrounds (left and right of valid range)
            if (validMinX > 0) {
                chart.append('rect')
                    .attr('class', 'invalid-range-bg')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', validMinX)
                    .attr('height', chartHeight);
            }
            
            if (validMaxX < chartWidth) {
                chart.append('rect')
                    .attr('class', 'invalid-range-bg')
                    .attr('x', validMaxX)
                    .attr('y', 0)
                    .attr('width', chartWidth - validMaxX)
                    .attr('height', chartHeight);
            }

            // Add valid range background
            chart.append('rect')
                .attr('class', 'valid-range-bg')
                .attr('x', Math.max(0, validMinX))
                .attr('y', 0)
                .attr('width', Math.min(chartWidth, validMaxX) - Math.max(0, validMinX))
                .attr('height', chartHeight);

            // Add range boundary lines
            if (validMinX >= 0 && validMinX <= chartWidth) {
                chart.append('line')
                    .attr('class', 'range-boundary-line')
                    .attr('x1', validMinX)
                    .attr('y1', 0)
                    .attr('x2', validMinX)
                    .attr('y2', chartHeight);
                
                // Add min boundary label
                // chart.append('text')
                //     .attr('class', 'range-boundary-label')
                //     .attr('x', validMinX)
                //     .attr('y', -5)
                //     .text(`Min: ${validMin}`);
            }

            if (validMaxX >= 0 && validMaxX <= chartWidth) {
                chart.append('line')
                    .attr('class', 'range-boundary-line')
                    .attr('x1', validMaxX)
                    .attr('y1', 0)
                    .attr('x2', validMaxX)
                    .attr('y2', chartHeight);
                
                // Add max boundary label
                // chart.append('text')
                //     .attr('class', 'range-boundary-label')
                //     .attr('x', validMaxX)
                //     .attr('y', -5)
                //     .text(`Max: ${validMax}`);
            }
        }

        // Plot previous KDE if it exists
        if (previousCheckResult && (showPlot === "both" || showPlot === "previous")) {
            previousCheckResult["simulated_results"].forEach((simulatedData, index) => {
                chart.append('path')
                    .datum(simulatedData["kde"])
                    .attr('class', 'kde-line previous-kde')
                    .attr('d', d3.line()
                        .x(d => x(d.x))
                        .y(d => yKDE(d.density)));
            });

            const previousRepKDE = previousCheckResult["avg_kde_result"];
            chart.append('path')
                .datum(previousRepKDE)
                .attr('class', 'kde-line previous-kde avg-kde')
                .attr('d', d3.line()
                    .x(d => x(d.x))
                    .y(d => yKDE(d.density)));

            // Add legend for previous results
            chart.append("rect")
                .attr("x", chartWidth - 50)
                .attr("y", 20)
                .attr("class", "legend-rect previous-rect");

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
                    .attr('class', 'kde-line current-kde')
                    .attr('d', d3.line()
                        .x(d => x(d.x))
                        .y(d => yKDE(d.density)));
            });

            const repKDE = results["avg_kde_result"];
            // Plot current KDE
            chart.append('path')
                .datum(repKDE)
                .attr('class', 'kde-line current-kde avg-kde')
                .attr('d', d3.line()
                    .x(d => x(d.x))
                    .y(d => yKDE(d.density)));


            // Add legend for current results
            chart.append("rect")
                .attr("x", chartWidth - 50)
                .attr("y", 10)
                .attr("class", "legend-rect current-rect");

            chart.append("text")
                .attr("x", chartWidth - 30)
                .attr("y", 15)
                .attr("text-anchor", "start")
                .style("font-size", "12px")
                .text("Current");
        }

        // // Add range legend if responseVar has valid range
        // if (responseVar && responseVar.min !== undefined && responseVar.max !== undefined) {
        //     const legendY = 40;
            
        //     // Valid range legend
        //     chart.append("rect")
        //         .attr("x", chartWidth - 50)
        //         .attr("y", legendY)
        //         .attr("width", 15)
        //         .attr("height", 4)
        //         .attr("class", "valid-range-bg")
        //         .style("opacity", 0.6);

        //     chart.append("text")
        //         .attr("x", chartWidth - 30)
        //         .attr("y", legendY + 4)
        //         .attr("text-anchor", "start")
        //         .style("font-size", "10px")
        //         .text("Valid Range");

        //     // Invalid range legend
        //     chart.append("rect")
        //         .attr("x", chartWidth - 50)
        //         .attr("y", legendY + 10)
        //         .attr("width", 15)
        //         .attr("height", 4)
        //         .attr("class", "invalid-range-bg")
        //         .style("opacity", 0.6);

        //     chart.append("text")
        //         .attr("x", chartWidth - 30)
        //         .attr("y", legendY + 14)
        //         .attr("text-anchor", "start")
        //         .style("font-size", "10px")
        //         .text("Out of Range");
        // }

        // Add title
        chart.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + labelOffset)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
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

    const checkTranslationDisabled = useCallback(() => {
        if (space === ELICITATION_SPACE.PARAMETER) {
            return Object.values(parametersDict).some(param => param.selectedDistributionIdx === null);
        }
        else if (space === ELICITATION_SPACE.OBSERVABLE) {
            const completedEntities = Object.values(entities).filter(entity => Object.keys(variablesDict).every(varName => entity[varName] !== null && entity[varName] !== undefined));
            return completedEntities.length === 0;
        }
    }, [space, parametersDict, entities]);

    return (
        <Box id='results-panel' sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <Typography variant="h6" gutterBottom>Predictive Check Results</Typography>
            <Button
                sx={{ my: 1 }}
                variant="contained"
                onClick={translate}
                disabled={checkTranslationDisabled()}
            >
                {space === ELICITATION_SPACE.OBSERVABLE ? "Translate" : "Check"}
            </Button>
            {isTranslating && <CircularProgress sx={{ my: 2 }} />}
            {!isTranslating && translationTimes > 0 &&
                <Box className='show-plot-box' sx={{ my: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>Level:</Typography>
                        <Button
                            variant={level === LEVELS.RELATIONAL ? "contained" : "outlined"}
                            size="small"
                            sx={{ mr: 1 }}
                            onClick={() => setLevel(LEVELS.RELATIONAL)}
                        >
                            {LEVELS.RELATIONAL}
                        </Button>
                        <Button
                            variant={level === LEVELS.DISTRIBUTIONAL ? "contained" : "outlined"}
                            size="small"
                            sx={{ mr: 1 }}
                            onClick={() => setLevel(LEVELS.DISTRIBUTIONAL)}
                        >
                            {LEVELS.DISTRIBUTIONAL}
                        </Button>
                        <Button
                            variant={level === LEVELS.UNIFORM ? "contained" : "outlined"}
                            size="small"
                            onClick={() => setLevel(LEVELS.UNIFORM)}
                        >
                            {LEVELS.UNIFORM}
                        </Button>
                    </Box>
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
                                        disabled={predictiveCheckResults.length === 1}
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
                                        disabled={predictiveCheckResults.length === 1}
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
            {!isTranslating && translationTimes > 0 &&
                <Box className="prior-result-div" sx={{ my: 2, p: 2 }}>
                    <Typography variant="h6" gutterBottom>Prior Distributions</Typography>
                    {Object.entries(parametersDict).map(([paramName, param]) => (
                        <Box className="prior-result-item" key={paramName} sx={{ p: 1, display: 'flex', flexDirection: 'row', alignItems: 'space-between' }}>
                            <Typography variant="body1" color="text.primary" sx={{ mr: 1, borderRight: '1px solid #bbb', pr: 1 }}><InlineMath math={`\\alpha_{${paramName}}`} /></Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                {getDistributionNotation(param.distributions[param.selectedDistributionIdx])}
                            </Typography>
                        </Box>
                    ))}
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