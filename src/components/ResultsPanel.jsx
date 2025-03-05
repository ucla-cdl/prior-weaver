import { Box, Button, CircularProgress, FormControl, Grid2, IconButton, InputLabel, MenuItem, Select, Slider, Snackbar, Alert } from '@mui/material';
import React, { useState, useRef, useEffect, useContext } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import "./ResultsPanel.css";
import EditIcon from '@mui/icons-material/Edit';
import { VariableContext } from '../contexts/VariableContext';
import { EntityContext } from '../contexts/EntityContext';

const DISTRIBUTION_TYPES = {
    'Normal': 'norm',
    'Exponential': 'expon',
    'LogNormal': 'lognorm',
    'Gamma': 'gamma',
    'Beta': 'beta',
    'Uniform': 'uniform',
};

export default function ResultsPanel() {
    const { variablesDict, parametersDict } = useContext(VariableContext);
    const { entities } = useContext(EntityContext);

    const [isTranslating, setIsTranslating] = useState(false);
    const [translated, setTranslated] = useState(0);

    const [priorsDict, setPriorsDict] = useState({});
    const [editParams, setEditParams] = useState(false);
    const [paramsRange, setParamsRange] = useState({});
    const paramsRangeDelta = 3;
    const [selectedPriorDistributions, setSelectedPriorDistributions] = useState({});

    const [previousCheckResult, setPreviousCheckResult] = useState(null);

    const svgHeight = 250;
    const margin = { top: 10, bottom: 40, left: 40, right: 20, };
    const labelOffset = 35;

    const colors = d3.scaleOrdinal(d3.schemeCategory10);

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    useEffect(() => {
        if (translated > 0) {
            plotPriorsResults(priorsDict);
        }
    }, [translated]);

    /**
     * Update the plot and prior distriburions when the selected distribution changes
     */
    useEffect(() => {
        if (translated > 0) {
            console.log("selectedPriorDistributions", selectedPriorDistributions);
            // Update the appearance of the selected distribution
            Object.entries(selectedPriorDistributions).forEach(([paramName, dist]) => {
                plotFittedDistribution(paramName, priorsDict[paramName], dist);
            });

            predictiveCheck();
        }
    }, [selectedPriorDistributions]);

    const readyToTranslate = () => {
        const incompleteEntities = Object.values(entities).some(entity => {
            return Object.values(entity).some(value => value === null);
        });

        if (incompleteEntities) {
            setSnackbarMessage('All entities must be completed before translating');
            setSnackbarOpen(true);
            return false;
        }

        return true;
    };

    const translate = () => {
        if (!readyToTranslate()) {
            return;
        }

        setIsTranslating(true);

        axios
            .post(window.BACKEND_ADDRESS + "/translate", {
                entities: Object.values(entities),
                variables: Object.values(variablesDict),
                parameters: Object.values(parametersDict),
            })
            .then((response) => {
                console.log("translated", response.data);
                setPriorsDict(response.data.priors_results);
                setIsTranslating(false);
                setTranslated(prev => prev + 1);
            });
    };

    const predictiveCheck = () => {
        console.log("predictive check", selectedPriorDistributions);
        axios
            .post(window.BACKEND_ADDRESS + "/check", {
                variables: Object.values(variablesDict),
                priors: Object.values(selectedPriorDistributions),
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

            // Set the first distribution as the selected distribution for this parameter
            selectFittedDistribution(paramName, priorResult.distributions[0]);
        });
    }

    const plotFittedDistribution = (paramName, priorResult, dist) => {
        const svg = d3.select(`#parameter-svg-${paramName}`)
        svg.html('');
        const chartWidth = svg.node().clientWidth - margin.left - margin.right;
        const chartHeight = svg.node().clientHeight - margin.top - margin.bottom;

        // Append a group element to the SVG for the chart
        const chart = svg.append('g')
            .attr('id', `parameter-distribution-${paramName}`)
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain([priorResult.min, priorResult.max])
            .nice()
            .range([0, chartWidth]);

        const yMax = d3.max(dist.p);
        const y = d3.scaleLinear()
            .domain([0, yMax])
            .range([chartHeight, 0]);

        const line = d3.line()
            .x(d => x(d[0]))
            .y(d => y(d[1]));

        // Create the x-axis
        chart.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x));

        // Create the y-axis
        chart.append('g')
            .attr('transform', `translate(0, 0)`)
            .call(d3.axisLeft(y));

        // Plot current distribution
        chart.append('path')
            .datum(dist.x.map((d, i) => [d, dist.p[i]]))
            .attr('fill', 'none')
            .attr('stroke', 'blue')
            .attr('stroke-width', 1.5)
            .attr('d', line);

        // Add title to each histogram
        chart.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + labelOffset)
            .attr('text-anchor', 'middle')
            .text(paramName);

        // Add caption below the title
        chart.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight + labelOffset + 5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('fill', 'gray')
            .text(getDistributionNotation(dist));
    }

    const selectFittedDistribution = (parameter, dist) => {
        console.log("select fitted distribution", parameter, dist);

        // Set the range of the parameter
        const ranges = {}
        Object.entries(dist.params).map(([paramName, paramVal]) => {
            ranges[paramName] = { min: paramVal - paramsRangeDelta, max: paramVal + paramsRangeDelta };
        });
        setParamsRange(prev => ({ ...prev, [parameter]: ranges }));

        // Update the selectedFittedDistributions state
        setSelectedPriorDistributions(prev => {
            return {
                ...prev,
                [parameter]: { ...dist },
            }
        });
    }

    const getDistributionNotation = (dist) => {
        const params = dist.params;
        switch (dist.name) {
            case DISTRIBUTION_TYPES.Normal:
                return `X ~ Normal(μ = ${params.loc}, σ = ${params.scale})`;
            case DISTRIBUTION_TYPES.Exponential:
                return `X ~ Exponential(λ = ${(1 / params.scale).toFixed(2)})`;
            case DISTRIBUTION_TYPES.LogNormal:
                return `X ~ Log-Normal(μ = ${Math.log(params.scale).toFixed(2)}, σ = ${params.s})`;
            case DISTRIBUTION_TYPES.Gamma:
                return `X ~ Gamma(α = ${params.a}, β = ${(1 / params.scale).toFixed(2)})`;
            case DISTRIBUTION_TYPES.Beta:
                return `X ~ Beta(${params.a}, ${params.b}, loc = ${params.loc}, scale = ${params.scale})`;
            case DISTRIBUTION_TYPES.Uniform:
                return `X ~ Uniform(a = ${params.loc}, b = ${params.loc + params.scale})`;
            default:
                return `Unknown distribution`;
        }
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
                const area = d3.sum(response.data.p) * (selectedPriorDistributions[paramName].x[1] - selectedPriorDistributions[paramName].x[0]);
                console.log("Area under the PDF curve:", area);

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
                disabled={Object.values(entities).length === 0}
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
                    <Box sx={{ width: '100%' }}>
                        <h4>Prior Distributions</h4>
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row', overflowX: 'auto' }}>
                            {Object.values(parametersDict).map((parameter, idx) => (
                                <Box key={idx}>
                                    {priorsDict[parameter.name] &&
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                                                <FormControl>
                                                    <InputLabel id={`select-label-${idx}`}>Distribution</InputLabel>
                                                    <Select
                                                        labelId={`select-label-${idx}`}
                                                        value={selectedPriorDistributions[parameter.name]?.name || ''}
                                                        label="Distribution"
                                                        onChange={(e) => {
                                                            const selectedDist = priorsDict[parameter.name].distributions.find(dist => dist.name === e.target.value);
                                                            selectFittedDistribution(parameter.name, selectedDist);
                                                        }}
                                                    >
                                                        {priorsDict[parameter.name].distributions.map((dist, distIdx) => (
                                                            <MenuItem key={distIdx} value={dist.name}>
                                                                {dist.name}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <IconButton size='small' color={editParams ? 'primary' : ''} onClick={() => setEditParams(!editParams)}>
                                                    <EditIcon />
                                                </IconButton>
                                            </Box>
                                            {editParams && Object.keys(selectedPriorDistributions[parameter.name].params).map((paramKey, paramIdx) => {
                                                return (
                                                    <Box sx={{ my: 1, display: 'flex', flexDirection: 'row' }} key={paramIdx}>
                                                        <InputLabel id={`slider-label-${idx}-${paramIdx}`}>{paramKey}</InputLabel>
                                                        <Slider
                                                            size='small'
                                                            value={selectedPriorDistributions[parameter.name].params[paramKey]}
                                                            min={paramsRange[parameter.name][paramKey].min}
                                                            max={paramsRange[parameter.name][paramKey].max}
                                                            step={0.02}
                                                            marks
                                                            valueLabelDisplay="on"
                                                            onChange={(e, newValue) => {
                                                                updateSelectedPriorDistribution(parameter.name, paramKey, newValue);
                                                            }}
                                                            aria-labelledby={`slider-label-${idx}-${paramIdx}`}
                                                        />
                                                    </Box>
                                                )
                                            })}
                                        </Box>
                                    }
                                    <Box key={idx} sx={{ width: '100%' }} id={'parameter-div-' + parameter.name}></Box>
                                </Box>
                            ))}
                        </Box>
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