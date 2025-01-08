import { Box, Button, CircularProgress } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import * as d3 from 'd3';

export default function ResultsPanel({ entities, variablesDict }) {
    const [isTranslating, setIsTranslating] = useState(false);
    const [translated, setTranslated] = useState(false);

    const width = 300;
    const height = 500;
    const margin = { top: 40, right: 30, bottom: 40, left: 40 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const offset = 100;

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
        document.getElementById('parameter-histogram-div').innerHTML = '';
        const container = d3.select('#parameter-histogram-div')

        Object.entries(parameterDistributions).forEach(([parameter, distribution], index) => {
            // Create an SVG element
            const svg = container.append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr('transform', `translate(${index * (width + offset)}, 0)`);

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
                .attr('y', plotHeight + margin.bottom)
                .attr('text-anchor', 'middle')
                .text(parameter);
        });
    };

    const plotFittedDistributions = (fittedDistributions) => {
        const colors = d3.scaleOrdinal(d3.schemeCategory10);

        Object.entries(fittedDistributions).forEach(([parameter, fittedDists], index) => {
            const svg = d3.select(`#parameter-histogram-div svg:nth-child(${index + 1})`);
            const yRightMax = d3.max(Object.values(fittedDists).map(distParams => d3.max(distParams.p)));

            Object.entries(fittedDists).forEach(([distName, distParams], distIndex) => {
                const x = d3.scaleLinear()
                    .domain([d3.min(distParams.x), d3.max(distParams.x)])
                    .range([0, plotWidth]);

                const yRight = d3.scaleLinear()
                    .domain([0, yRightMax])
                    .range([plotHeight, 0]);

                const line = d3.line()
                    .x(d => x(d[0]))
                    .y(d => yRight(d[1]));

                const g = svg.append('g')
                    .attr('transform', `translate(${margin.left},${margin.top})`);

                g.append('path')
                    .datum(distParams.x.map((d, i) => [d, distParams.p[i]]))
                    .attr('fill', 'none')
                    .attr('stroke', colors(distIndex))
                    .attr('stroke-width', 1.5)
                    .attr('d', line);

                g.append('g')
                    .attr('transform', `translate(${plotWidth},0)`)
                    .call(d3.axisRight(yRight));
            });

            // Add legend
            const legend = svg.append('g')
                .attr('transform', `translate(${plotWidth - margin.right},${margin.top})`);

            Object.keys(fittedDists).forEach((distName, distIndex) => {
                const legendRow = legend.append('g')
                    .attr('transform', `translate(0, ${distIndex * 20})`);

                legendRow.append('rect')
                    .attr('width', 10)
                    .attr('height', 10)
                    .attr('fill', colors(distIndex));

                legendRow.append('text')
                    .attr('x', 15)
                    .attr('y', 10)
                    .attr('text-anchor', 'start')
                    .attr('font-size', 10)
                    .text(distName);
            });
        });
    };

    return (
        <Box>
            <Button variant="contained" onClick={translate}>Translate</Button>
            {isTranslating && <CircularProgress />}
            <div id='parameter-histogram-div'>
            </div>
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