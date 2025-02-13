import { Box, Button, CircularProgress, Grid2 } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import "./ResultsPanel.css";

const DISTRIBUTION_TYPES = {
    'Normal': 'norm',
    'Exponential': 'expon',
    'LogNormal': 'lognorm',
    'Gamma': 'gamma',
    'Beta': 'beta',
    'Uniform': 'uniform',
};

export default function ResultsPanel({ entities, variablesDict }) {
    const [isTranslating, setIsTranslating] = useState(false);
    const [translated, setTranslated] = useState(false);

    const [fittedDistributions, setFittedDistributions] = useState({});
    const [selectedFittedDistributions, setSelectedFittedDistributions] = useState({});

    const width = 300;
    const height = 300;
    const margin = { top: 40, right: 40, bottom: 60, left: 40 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const offset = 180;

    const colors = d3.scaleOrdinal(d3.schemeCategory10);

    // /**
    //  * Update the apperance when the selected distribution changes
    //  */
    // useState(() => {
    //     updateFittedDistributionsStyle();
    // }, [selectedFittedDistributions]);

    const translate = () => {
        setIsTranslating(true);
        console.log("variablesDict", variablesDict);

        axios
            .post(window.BACKEND_ADDRESS + "/translate", {
                entities: Object.values(entities),
                variables: Object.values(variablesDict),
            })
            .then((response) => {
                console.log("translated", response.data);
                plotParametersHistogram(response.data.parameter_distributions);
                plotFittedDistributions(response.data.fitted_distributions);
                plotPredictiveCheck(response.data.results);
            })
            .finally(() => {
                setIsTranslating(false);
                setTranslated(true);
            });
    };

    const plotPredictiveCheck = (results) => {
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

        simulatedResults.forEach((simulatedData, index) => {
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

    const plotParametersHistogram = (parameterDistributions) => {
        // Plot the histogram of simulated parametric data for each parameter 
        Object.entries(parameterDistributions).forEach(([parameter, distribution], index) => {
            document.getElementById('parameter-histogram-div-' + parameter).innerHTML = '';

            // Create an SVG element
            const svg = d3.select('#parameter-histogram-div-' + parameter)
                .append('svg')
                .attr('width', width)
                .attr('height', height);

            // Append a group element to the SVG to position the chart
            const g = svg.append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Set the range for x and y axes based on the data
            const x = d3.scaleLinear()
                .domain([d3.min(distribution), d3.max(distribution)])
                .nice()
                .range([0, plotWidth]);

            const bins = d3.bin()
                .domain(x.domain())
                .thresholds(x.ticks(15))(distribution);

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
                .attr('width', d => x(d.x1) - x(d.x0) - 1) // Adjust width for padding
                .attr('y', d => y(d.length))
                .attr('height', d => plotHeight - y(d.length))
                .attr('fill', colors(index));

            // Add title to each histogram
            g.append('text')
                .attr('x', plotWidth / 2)
                .attr('y', plotHeight + margin.bottom - 15)
                .attr('text-anchor', 'middle')
                .text(parameter);
        });
    };

    const selectFittedDistribution = (parameter, distParams) => {
        console.log("select fitted distribution", parameter, distParams);

        // Update the selectedFittedDistributions state
        setSelectedFittedDistributions(prev => {
            updateFittedDistributionsStyle(parameter, prev[parameter]?.name, distParams.name);

            return {
                ...prev,
                [parameter]: { ...distParams },
            }
        });
    }

    const updateFittedDistributionsStyle = (parameter, prevSelectedDistName, curSelectedDistName) => {
        if (prevSelectedDistName) {
            console.log("remove highlight from", prevSelectedDistName);
            const prevSvgRect = d3.select(`#fitted-distribution-rect-${parameter}-${prevSelectedDistName}`);
            prevSvgRect.classed('selected-fitted-distribution-rect', false);
        }

        // highlight the current selected distribution
        const svgRect = d3.select(`#fitted-distribution-rect-${parameter}-${curSelectedDistName}`);
        svgRect.classed('selected-fitted-distribution-rect', true);
    }

    const getDistributionNotation = (distParams) => {
        const params = distParams.params;
        switch (distParams.name) {
            case DISTRIBUTION_TYPES.Normal:
                return `X ~ Normal(μ = ${params.loc}, σ² = ${Math.pow(params.scale, 2)})`;
            case DISTRIBUTION_TYPES.Exponential:
                return `X ~ Exponential(λ = ${1 / params.scale})`;
            case DISTRIBUTION_TYPES.LogNormal:
                return `X ~ Log-Normal(μ = ${Math.log(params.scale)}, σ = ${params.s})`;
            case DISTRIBUTION_TYPES.Gamma:
                return `X ~ Gamma(α = ${params.a}, β = ${1 / params.scale})`;
            case DISTRIBUTION_TYPES.Beta:
                return `X ~ Beta(${params.a}, ${params.b}, loc = ${params.loc}, scale = ${params.scale})`;
            case DISTRIBUTION_TYPES.Uniform:
                return `X ~ Uniform(a = ${params.loc}, b = ${params.loc + params.scale})`;
            default:
                return `Unknown distribution`;
        }
    }

    const plotFittedDistributions = (fittedDistributions) => {
        setFittedDistributions(fittedDistributions);

        Object.entries(fittedDistributions).forEach(([parameter, fittedDists], index) => {
            // Plot the fitted distributions for each parameter
            const container = d3.select(`#parameter-distributions-div-${parameter}`);
            container.html('');

            const hasSelectedFittedDistributions = selectedFittedDistributions[parameter] !== undefined;
            let yMax = d3.max(Object.values(fittedDists).map(distParams => d3.max(distParams.p)));
            if (hasSelectedFittedDistributions) {
                yMax = Math.max(yMax, d3.max(selectedFittedDistributions[parameter].p));
            }

            Object.entries(fittedDists).forEach(([distName, distParams], distIndex) => {
                const svg = container.append('svg')
                    .attr('id', `fitted-distribution-${parameter}-${distName}`)
                    // .attr('transform', `translate(${(index + hasSelectedFittedDistributions) * (width + offset)}, 0)`)
                    .attr('width', width)
                    .attr('height', height)
                    .on('click', function (event, d) {
                        selectFittedDistribution(parameter, distParams);
                    });

                const svgGroup = svg.append('g');

                // Add a surrounding rectangle to indicate selection
                svgGroup.append('rect')
                    .attr('id', `fitted-distribution-rect-${parameter}-${distName}`)
                    .attr('class', 'fitted-distribution-rect')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('rx', 15)
                    .attr('ry', 15)
                    .attr('width', width)
                    .attr('height', height);

                const x = d3.scaleLinear()
                    .domain([d3.min(distParams.x), d3.max(distParams.x)])
                    .range([0, plotWidth]);

                const y = d3.scaleLinear()
                    .domain([0, yMax])
                    .range([plotHeight, 0]);

                const line = d3.line()
                    .x(d => x(d[0]))
                    .y(d => y(d[1]));

                // Append a group element to the SVG for the chart
                const g = svgGroup.append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);

                // Create the x-axis
                g.append('g')
                    .attr('transform', `translate(0,${plotHeight})`)
                    .call(d3.axisBottom(x));

                // Create the y-axis
                g.append('g')
                    .call(d3.axisLeft(y));

                g.append('path')
                    .datum(distParams.x.map((d, i) => [d, distParams.p[i]]))
                    .attr('fill', 'none')
                    .attr('stroke', colors(index))
                    .attr('stroke-width', 1.5)
                    .attr('d', line);

                // Add title to each histogram
                g.append('text')
                    .attr('x', plotWidth / 2)
                    .attr('y', plotHeight + margin.bottom - 20)
                    .attr('text-anchor', 'middle')
                    .text(distName);

                // Add caption below the title
                g.append('text')
                    .attr('x', plotWidth / 2)
                    .attr('y', plotHeight + margin.bottom - 5)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', '11px')
                    .attr('fill', 'gray')
                    .text(getDistributionNotation(distParams));
            });

            // If there is no selection yet, Set the first distribution as the selected distribution for this parameter
            if (!selectedFittedDistributions[parameter]) {
                selectFittedDistribution(parameter, Object.values(fittedDists)[0]);
            }
            // If there is a selection, update the style of the selected distribution
            else {
                updateFittedDistributionsStyle(parameter, null, selectedFittedDistributions[parameter].name);
            }
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Button sx={{ my: 2 }} variant="contained" onClick={translate}>Translate</Button>
            {isTranslating && <CircularProgress sx={{ my: 3 }} />}
            <Grid2 container spacing={3}
                sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}
            >
                {/* Histogram Column */}
                <Grid2 size={3} sx={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #ccc', pr: 2 }}>
                    <h4>Parameter Histogram</h4>
                    {Object.values(variablesDict).map((variable, idx) => (
                        <Box sx={{ my: 1 }} key={idx} id={'parameter-histogram-div-' + variable.name}></Box>
                    ))}
                    <Box sx={{ my: 1 }} id={'parameter-histogram-div-intercept'}></Box>
                </Grid2>

                {/* Fitted Distributions Column */}
                <Grid2 size={9} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <h4>Fitted Continuous Distributions</h4>
                    {Object.values(variablesDict).map((variable, idx) => (
                        <Box sx={{ my: 1 }} key={idx} id={'parameter-distributions-div-' + variable.name}></Box>
                    ))}
                    <Box sx={{ my: 1 }} id={'parameter-distributions-div-intercept'}></Box>
                </Grid2>
            </Grid2>
            <Box sx={{ my: 2 }} id={'predictive-check-div'}>

            </Box>
        </Box>
    )
};