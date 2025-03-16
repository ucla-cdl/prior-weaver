import { Box, FormControl, IconButton, InputLabel, MenuItem, Select, Slider, ToggleButton, Typography, RadioGroup, FormControlLabel, Radio, Button } from "@mui/material";
import { useState, useEffect, useRef, useContext } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import "./ParameterPlot.css";
import { PriorContext } from '../contexts/PriorContext';

const DISTRIBUTION_TYPES = {
    'Normal': 'norm',
    'Exponential': 'expon',
    'LogNormal': 'lognorm',
    'Gamma': 'gamma',
    'Beta': 'beta',
    'Uniform': 'uniform',
};

const EDIT_MODES = {
    DISTRIBUTION: 'distribution',
    ROULETTE: 'roulette'
}

export const ParameterPlot = ({ parameter }) => {
    const { priorsDict, updatePrior} = useContext(PriorContext);
    const [editMode, setEditMode] = useState(EDIT_MODES.ROULETTE);
    const [drawnPoints, setDrawnPoints] = useState([]);
    const [showFittedDistribution, setShowFittedDistribution] = useState(false);

    const svgHeight = 250;
    const svgWidth = 400;
    const margin = { top: 10, bottom: 40, left: 40, right: 40 };
    const labelOffset = 35;
    const chartWidth = svgWidth - margin.left - margin.right;
    const chartHeight = svgHeight - margin.top - margin.bottom;

    useEffect(() => {
        drawPlot();
        if (editMode === EDIT_MODES.ROULETTE) {
            plotRoulette();
        }
    }, [parameter, editMode]);

    useEffect(() => {
        if (editMode === EDIT_MODES.ROULETTE) {
            plotRoulette();
        }
    }, [drawnPoints]);

    const drawPlot = () => {
        const container = d3.select(`#parameter-container-${parameter.name}`);
        container.html('');

        let svg = container.append('svg')
            .attr('id', `parameter-svg-${parameter.name}`)
            .attr('width', svgWidth)
            .attr('height', svgHeight);

        // Create roulette chart
        svg.append('g')
            .attr('id', `parameter-roulette-${parameter.name}`)
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create distribution chart
        svg.append('g')
            .attr('id', `parameter-distribution-${parameter.name}`)
            .attr('transform', `translate(${margin.left},${margin.top})`);
    }

    const plotDistribution = (distribution) => {
        let chart = d3.select(`#parameter-distribution-${parameter.name}`);
        chart.html('');

        const x = d3.scaleLinear()
            .domain([parameter.min, parameter.max])
            .nice()
            .range([0, chartWidth]);

        const yMax = d3.max(distribution.p);
        const y = d3.scaleLinear()
            .domain([0, yMax])
            .range([chartHeight, 0]);

        const line = d3.line()
            .x(d => x(d[0]))
            .y(d => y(d[1]));

        // Add y-axis
        chart.append('g')
            .attr('transform', `translate(${chartWidth}, 0)`)
            .call(d3.axisRight(y));

        // Distribution curve
        chart.append('path')
            .datum(distribution.x
                .map((d, i) => [d, distribution.p[i]])
                .filter(([x, _]) => x >= parameter.min && x <= parameter.max))
            .attr('fill', 'none')
            .attr('stroke', 'blue')
            .attr('stroke-width', 1.5)
            .attr('d', line);
    };

    const plotRoulette = () => {
        let chart = d3.select(`#parameter-roulette-${parameter.name}`);
        chart.html('');

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([parameter.min, parameter.max])
            .range([0, chartWidth]);

        const maxY = 10; // Fixed max height for roulette
        const yScale = d3.scaleLinear()
            .domain([0, maxY])
            .range([chartHeight, 0]);

        // Draw axes
        chart.append('g')
            .attr('transform', `translate(0,${chartHeight})`)
            .call(d3.axisBottom(xScale));

        // Add X axis label
        chart.append("text")
            .attr("text-anchor", "middle")
            .attr("transform", `translate(${chartWidth / 2}, ${chartHeight + labelOffset})`)
            .style("font-size", "14px")
            .text(`${parameter.name}`);

        chart.append('g')
            .call(d3.axisLeft(yScale));

        // Draw grid cells for roulette interface
        for (let grid = 1; grid <= maxY; grid++) {
            for (let bin = 0; bin < parameter.binEdges.length - 1; bin++) {
                const binCnt = drawnPoints[bin];
                chart.append("rect")
                    .attr("class", binCnt >= grid ? "fill-grid-cell" : "non-fill-grid-cell")
                    .attr("id", `${parameter.name}-${grid}-${bin}`)
                    .attr("transform", `translate(${xScale(parameter.binEdges[bin])}, ${yScale(grid)})`)
                    .attr("width", xScale(parameter.binEdges[bin + 1]) - xScale(parameter.binEdges[bin]))
                    .attr("height", yScale(grid) - yScale(grid + 1))
                    .on("click", function (event, d) {
                        // Update entities
                        let deltaHeight = grid - binCnt;
                        // if clicked count is larger than previous
                        if (deltaHeight !== 0) {
                            setDrawnPoints(prev => {
                                const newPoints = [...prev];
                                newPoints[bin] = grid;
                                return newPoints;
                            });
                        }
                        // if clicked count is smaller than or equal to previous
                        else {
                            setDrawnPoints(prev => {
                                const newPoints = [...prev];
                                newPoints[bin] = grid - 1;
                                return newPoints;
                            });
                        }
                    });
            }
        }
    };

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

    const fitDistribution = () => {
        // Convert drawn points to the format backend expects
        const histogramData = drawnPoints.map((count, index) => ({
            bin_start: parameter.binEdges[index],
            bin_end: parameter.binEdges[index + 1],
            count: count || 0
        }));

        axios.post(window.BACKEND_ADDRESS + "/fitDistribution", {
            histogram: histogramData
        }).then((response) => {
            console.log(response.data);
            updatePrior(parameter.name, response.data.distribution);
            plotDistribution(response.data.distribution);
            setShowFittedDistribution(true);
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">{parameter.name}</Typography>
                {showFittedDistribution && priorsDict[parameter.name] && (
                    <>
                        <Typography variant="body2" color="text.secondary">
                            {getDistributionNotation(priorsDict[parameter.name])}
                        </Typography>
                    </>
                )}

                <Button
                    size="small"
                    variant="contained"
                    onClick={fitDistribution}
                    disabled={!drawnPoints.some(count => count > 0)}
                >
                    Fit Distribution
                </Button>
            </Box>

            <Box id={`parameter-container-${parameter.name}`} />
        </Box>
    );
};