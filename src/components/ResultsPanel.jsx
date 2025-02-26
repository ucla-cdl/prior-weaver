import { Box, Button, CircularProgress, FormControl, Grid2, IconButton, InputLabel, MenuItem, Select, Slider, Snackbar, Alert } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import "./ResultsPanel.css";
import EditIcon from '@mui/icons-material/Edit';

const DISTRIBUTION_TYPES = {
    'Normal': 'norm',
    'Exponential': 'expon',
    'LogNormal': 'lognorm',
    'Gamma': 'gamma',
    'Beta': 'beta',
    'Uniform': 'uniform',
};

export default function ResultsPanel({ entities, variablesDict, parametersDict }) {
    const [isTranslating, setIsTranslating] = useState(false);
    const [translated, setTranslated] = useState(false);

    const [priorsDict, setPriorsDict] = useState({});
    const [editParams, setEditParams] = useState(false);
    const [paramsRange, setParamsRange] = useState({});
    const paramsRangeDelta = 3;
    const [selectedPriorDistributions, setSelectedPriorDistributions] = useState({});

    const width = 350;
    const height = 300;
    const margin = { top: 40, right: 40, bottom: 60, left: 40 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const offset = 180;

    const colors = d3.scaleOrdinal(d3.schemeCategory10);

    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    useEffect(() => {
        if (translated) {
            plotPriorsResults();
        }
    }, [translated]);
    
    /**
     * Update the plot and prior distriburions when the selected distribution changes
     */
    useEffect(() => {
        if (translated) {
            console.log("selectedPriorDistributions", selectedPriorDistributions);
            // Update the appearance of the selected distribution
            Object.entries(selectedPriorDistributions).forEach(([paramName, dist]) => {
                plotFittedDistribution(paramName, priorsDict[paramName], dist);
            });

            predictiveCheck();
        }
    }, [selectedPriorDistributions]);

    const hasNullValues = () => {
        return Object.values(entities).some(entity => {
            return Object.values(entity).some(value => value === null);
        });
    };

    const translate = () => {
        if (hasNullValues()) {
            setSnackbarMessage('All entities must be completed before translating');
            setSnackbarOpen(true);
            return;
        }

        setIsTranslating(true);
        console.log("variablesDict", variablesDict);
        console.log("parametersDict", parametersDict);

        axios
            .post(window.BACKEND_ADDRESS + "/translate", {
                entities: Object.values(entities),
                variables: Object.values(variablesDict),
                parameters: Object.values(parametersDict),
            })
            .then((response) => {
                console.log("translated", response.data);
                setPriorsDict(response.data.priors_results);
            })
            .finally(() => {
                setIsTranslating(false);
                setTranslated(true);
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
            // Create an SVG element
            document.getElementById('parameter-div-' + paramName).innerHTML = '';
            d3.select('#parameter-div-' + paramName)
                .append('svg')
                .attr('id', 'parameter-svg-' + paramName)
                .attr('width', width)
                .attr('height', height);

            // Plot the histogram of simulated parametric data for each parameter 
            plotParameterHistogram(paramName, priorResult);

            // Set the first distribution as the selected distribution for this parameter
            selectFittedDistribution(paramName, priorResult.distributions[0]);
        });
    }

    const plotParameterHistogram = (paramName, priorResult) => {
        const svg = d3.select('#parameter-svg-' + paramName)

        // Append a group element to the SVG to position the chart
        const g = svg.append('g')
            .attr('id', 'parameter-histogram-' + paramName)
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear()
            .domain([priorResult.min, priorResult.max])
            .nice()
            .range([0, plotWidth]);

        const bins = d3.bin()
            .domain(x.domain())
            .thresholds(x.ticks(15))(priorResult.samples);

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .nice()
            .range([plotHeight, 0]);

        // Create the x-axis
        g.append('g')
            .attr('transform', `translate(0,${plotHeight})`)
            .call(d3.axisBottom(x));

        // Create the y-axis
        g.append('g')
            .call(d3.axisLeft(y));

        // Add bars for the histogram
        g.selectAll('.bar')
            .data(bins)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.x0))
            .attr('width', d => d3.max([x(d.x1) - x(d.x0) - 1, 0])) // Adjust width for padding
            .attr('y', d => y(d.length))
            .attr('height', d => plotHeight - y(d.length))
            .attr('fill', 'lightgray')
            .lower();

        // Add title to each histogram
        g.append('text')
            .attr('x', plotWidth / 2)
            .attr('y', plotHeight + margin.bottom - 15)
            .attr('text-anchor', 'middle')
            .text(paramName);
    }

    const plotFittedDistribution = (paramName, priorResult, dist) => {
        const svg = d3.select('#parameter-svg-' + paramName)
        d3.select('#parameter-distribution-' + paramName)?.remove();

        const x = d3.scaleLinear()
            .domain([priorResult.min, priorResult.max])
            .nice()
            .range([0, plotWidth]);

        const yMax = d3.max(dist.p);
        const y = d3.scaleLinear()
            .domain([0, yMax])
            .range([plotHeight, 0]);

        const line = d3.line()
            .x(d => x(d[0]))
            .y(d => y(d[1]));

        // Append a group element to the SVG for the chart
        const g = svg.append('g')
            .attr('id', 'parameter-distribution-' + paramName)
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create the y-axis
        g.append('g')
            .attr('transform', `translate(${plotWidth}, 0)`)
            .call(d3.axisRight(y));

        g.append('path')
            .datum(dist.x.map((d, i) => [d, dist.p[i]]))
            .attr('fill', 'none')
            .attr('stroke', 'blue')
            .attr('stroke-width', 1.5)
            .attr('d', line);

        // Add caption below the title
        g.append('text')
            .attr('x', plotWidth / 2)
            .attr('y', plotHeight + margin.bottom - 5)
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

        const simulatedResults = results["simulated_results"];
        const minX = results["min_response_val"]
        const maxX = results["max_response_val"]
        const maxY = results["max_density_val"]

        const svg = containerDiv
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const x = d3.scaleLinear()
            .domain([minX, maxX])
            .nice()
            .range([0, plotWidth]);

        const yKDE = d3.scaleLinear()
            .domain([0, maxY])
            .nice()
            .range([plotHeight, 0]);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create the x-axis
        g.append('g')
            .attr('transform', `translate(0,${plotHeight})`)
            .call(d3.axisBottom(x));

        // Create the y-axis for the kde
        g.append('g')
            .call(d3.axisLeft(yKDE));

        // Add title to the histogram
        g.append('text')
            .attr('x', plotWidth / 2)
            .attr('y', plotHeight + margin.bottom - 15)
            .attr('text-anchor', 'middle')
            .text('Income');

        simulatedResults.forEach((simulatedData, index) => {
            // Plot fitted kde
            const line = d3.line()
                .x(d => x(d.x))
                .y(d => yKDE(d.density));

            g.append('path')
                .datum(simulatedData["kde"])
                .attr('fill', 'none')
                .attr('stroke', 'red')
                .attr('stroke-width', 1.5)
                .attr('d', line);
        });
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
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Button 
                sx={{ my: 2 }} 
                variant="contained" 
                onClick={translate}
                disabled={Object.values(entities).length === 0}
            >
                Translate
            </Button>
            {isTranslating && <CircularProgress sx={{ my: 3 }} />}
            {translated &&
                <Grid2 container spacing={2}
                    sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}
                >
                    <Grid2 item xs={4} sx={{ borderRight: '1px solid #ccc', pr: 2 }}>
                        <h4>Prior Predictive Check Result</h4>
                        <Box sx={{ my: 2 }} id={'predictive-check-div'}></Box>
                    </Grid2>
                    <Grid2 item xs={8}>
                        <h4>Prior Distributions</h4>
                        <IconButton color={editParams ? 'primary' : ''} onClick={() => setEditParams(!editParams)}>
                            <EditIcon />
                        </IconButton>
                        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                            {Object.values(parametersDict).map((parameter, idx) => (
                                <Box sx={{ my: 1 }} key={idx}>
                                    {priorsDict[parameter.name] &&
                                        <Box>
                                            <FormControl fullWidth>
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
                                    <Box sx={{ my: 1 }} key={idx} id={'parameter-div-' + parameter.name}></Box>
                                </Box>
                            ))}
                        </Box>
                    </Grid2>
                </Grid2>
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