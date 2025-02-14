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

export default function ResultsPanel({ entities, variablesDict, parametersDict }) {
    const [isTranslating, setIsTranslating] = useState(false);
    const [translated, setTranslated] = useState(false);

    const [selectedPriorDistributions, setSelectedPriorDistributions] = useState({});

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
                plotPriorsResults(response.data.priors_results);
                plotCheckResults(response.data.check_results);
            })
            .finally(() => {
                setIsTranslating(false);
                setTranslated(true);
            });
    };

    const plotPriorsResults = (priorsResults) => {
        Object.entries(priorsResults).forEach(([paramName, priorResult], index) => {
            // Create an SVG element
            document.getElementById('parameter-div-' + paramName).innerHTML = '';
            d3.select('#parameter-div-' + paramName)
                .append('svg')
                .attr('id', 'parameter-svg-' + paramName)
                .attr('width', width)
                .attr('height', height);

            const xScale = d3.scaleLinear()
                .domain([priorResult.min, priorResult.max])
                .nice()
                .range([0, plotWidth]);

            // Plot the histogram of simulated parametric data for each parameter 
            plotParameterHistogram(paramName, priorResult.samples, xScale, index);

            // Plot the best fitted distribution for each parameter
            plotFittedDistribution(paramName, priorResult.distributions[0], xScale, index);

            // If there is no selection yet, Set the first distribution as the selected distribution for this parameter
            if (!selectedPriorDistributions[paramName]) {
                selectFittedDistribution(paramName, priorResult.distributions[0]);
            }
        });
    }

    const plotParameterHistogram = (paramName, samples, xScale, paramIndex) => {
        const svg = d3.select('#parameter-svg-' + paramName)

        // Append a group element to the SVG to position the chart
        const g = svg.append('g')
            .attr('id', 'parameter-histogram-' + paramName)
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const bins = d3.bin()
            .domain(xScale.domain())
            .thresholds(xScale.ticks(15))(samples);

        const y = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .nice()
            .range([plotHeight, 0]);

        // Create the x-axis
        g.append('g')
            .attr('transform', `translate(0,${plotHeight})`)
            .call(d3.axisBottom(xScale));

        // Create the y-axis
        g.append('g')
            .call(d3.axisLeft(y));

        // Add bars for the histogram
        g.selectAll('.bar')
            .data(bins)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => xScale(d.x0))
            .attr('width', d => xScale(d.x1) - xScale(d.x0) - 1) // Adjust width for padding
            .attr('y', d => y(d.length))
            .attr('height', d => plotHeight - y(d.length))
            .attr('fill', colors(paramIndex));

        // Add title to each histogram
        g.append('text')
            .attr('x', plotWidth / 2)
            .attr('y', plotHeight + margin.bottom - 15)
            .attr('text-anchor', 'middle')
            .text(paramName);
    }

    const plotFittedDistribution = (paramName, dist, xScale, paramIndex) => {
        const svg = d3.select('#parameter-svg-' + paramName)

        const yMax = d3.max(dist.p);
        const y = d3.scaleLinear()
            .domain([0, yMax])
            .range([plotHeight, 0]);

        const line = d3.line()
            .x(d => xScale(d[0]))
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
            .attr('stroke', colors(paramIndex))
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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Button sx={{ my: 2 }} variant="contained" onClick={translate}>Translate</Button>
            {isTranslating && <CircularProgress sx={{ my: 3 }} />}
            <Grid2 container spacing={3}
                sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}
            >
                {Object.values(variablesDict).map((variable, idx) => (
                    <Box sx={{ my: 1 }} key={idx} id={'parameter-div-' + variable.name}></Box>
                ))}
                <Box sx={{ my: 1 }} id={'parameter-div-intercept'}></Box>
            </Grid2>
            <Box sx={{ my: 2 }} id={'predictive-check-div'}>

            </Box>
        </Box>
    )
};