import { Box, Button, CircularProgress, Grid2 } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import * as d3 from 'd3';

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
    const offset = 150;

    const colors = d3.scaleOrdinal(d3.schemeCategory10);

    /**
     * Update the apperance when the selected distribution changes
     */
    useEffect(() => {
        // Highlight the border of the selected distribution  
        Object.entries(fittedDistributions).forEach(([parameter, fittedDists]) => {
            const selectedDistName = selectedFittedDistributions[parameter].name;
            Object.entries(fittedDists).forEach(([distName, distParams], distIndex) => {
                const svg = d3.select(`#fitted-distribution-${parameter}-${distName}`);

                svg.attr('stroke', distName === selectedDistName ? 'black' : 'none')
                    // .attr('stroke', distName === selectedDistName ? 'red' : colors(distIndex))
                    // .attr('filter', distName === selectedDistName ? 'url(#floating-effect)' : null);
            });
        }
        );
    }, [selectedFittedDistributions]);

    const translate = () => {
        setIsTranslating(true);

        axios
            .post(window.BACKEND_ADDRESS + "/translate", {
                entities: Object.values(entities),
                variables: Object.values(variablesDict),
            })
            .then((response) => {
                console.log("translated", response.data);
                plotParametersHistogram(response.data.parameter_distributions);
                plotFittedDistributions(response.data.fitted_distributions);
            })
            .finally(() => {
                setIsTranslating(false);
                setTranslated(true);
            });
    };

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
                .attr('fill', '#69b3a2');

            // Add title to each histogram
            g.append('text')
                .attr('x', plotWidth / 2)
                .attr('y', plotHeight + margin.bottom - 15)
                .attr('text-anchor', 'middle')
                .text(parameter);
        });
    };

    const plotFittedDistributions = (fittedDistributions) => {
        setFittedDistributions(fittedDistributions);

        Object.entries(fittedDistributions).forEach(([parameter, fittedDists], index) => {
            // Set the first distribution as the selected distribution for this parameter
            if (!selectedFittedDistributions[parameter]) {
                console.log("set default selected distribution for", parameter);
                setSelectedFittedDistributions(prev => ({
                    ...prev,
                    [parameter]: Object.values(fittedDists)[0],
                }));
            }

            // Plot the fitted distributions for each parameter
            const container = d3.select(`#parameter-distributions-div-${parameter}`);
            container.html('');
            const yMax = d3.max(Object.values(fittedDists).map(distParams => d3.max(distParams.p)));

            Object.entries(fittedDists).forEach(([distName, distParams], distIndex) => {
                const svg = container.append('svg')
                    .attr('id', `fitted-distribution-${parameter}-${distName}`)
                    .attr('transform', `translate(${index * (width + offset)}, 0)`)
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

                const g = svg.append('g')
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
                    .attr('stroke', colors(distIndex))
                    .attr('stroke-width', 1.5)
                    .attr('d', line);

                // Add title to each histogram
                g.append('text')
                    .attr('x', plotWidth / 2)
                    .attr('y', plotHeight + margin.bottom - 15)
                    .attr('text-anchor', 'middle')
                    .text(distName);
            });
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
                        <div key={idx} id={'parameter-histogram-div-' + variable.name}></div>
                    ))}
                    <div id={'parameter-histogram-div-' + 'intercept'}></div>
                </Grid2>

                {/* Fitted Distributions Column */}
                <Grid2 size={9} sx={{ display: 'flex', flexDirection: 'column' }}>
                    <h4>Fitted Continuous Distributions</h4>
                    {Object.values(variablesDict).map((variable, idx) => (
                        <div key={idx} id={'parameter-distributions-div-' + variable.name}></div>
                    ))}
                    <div id={'parameter-distributions-div-' + 'intercept'}></div>
                </Grid2>
            </Grid2>
        </Box>
    )
};

/**
 * <Box>
                        {(() => {
                            const lastDistribution = variable.distributions[variable.distributions.length - 1];
                            const { name, params } = lastDistribution;

                            // Dynamically render the distribution notation based on the distribution type
                            switch (name) {
                                case 'norm':
                                    return (
                                        <h6>
                                            X &sim; Normal(&mu; = {params.loc}, &sigma;<sup>2</sup> = {Math.pow(params.scale, 2)})
                                        </h6>
                                    );
                                case 'expon':
                                    return (
                                        <h6>
                                            X &sim; Exponential(&lambda; = {1 / params.scale})
                                        </h6>
                                    );
                                case 'lognorm':
                                    return (
                                        <h6>
                                            X &sim; Log-Normal(&mu; = {Math.log(params.scale)}, &sigma; = {params.s})
                                        </h6>
                                    );
                                case 'gamma':
                                    return (
                                        <h6>
                                            X &sim; Gamma(&alpha; = {params.a}, &beta; = {1 / params.scale})
                                        </h6>
                                    );
                                case 'beta':
                                    return (
                                        <h6>
                                            X &sim; Beta({params.a}, {params.b}, loc = {params.loc}, scale = {params.scale})
                                        </h6>
                                    );
                                case 'uniform':
                                    return (
                                        <h6>
                                            X &sim; Uniform(a = {params.loc}, b = {params.loc + params.scale})
                                        </h6>
                                    );
                                default:
                                    return (
                                        <h6>Unknown distribution: {name}</h6>
                                    );
                            }
                        })()}
                    </Box>
 */