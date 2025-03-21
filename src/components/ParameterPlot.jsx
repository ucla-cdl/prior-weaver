import { Box, FormControl, IconButton, InputLabel, MenuItem, Select, Slider, ToggleButton, Typography, RadioGroup, FormControlLabel, Radio, Button, CircularProgress } from "@mui/material";
import { useState, useEffect, useRef, useContext } from 'react';
import * as d3 from 'd3';
import axios from 'axios';
import "./ParameterPlot.css";
import { WorkspaceContext } from '../contexts/WorkspaceContext';
import { VariableContext } from '../contexts/VariableContext';

const DISTRIBUTION_TYPES = {
    'uniform': 'Uniform',
    'norm': 'Normal',
    't': 'Student-t',
    'gamma': 'Gamma',
    'beta': 'Beta',
    'skewnorm': 'Skew Normal',
    'lognorm': 'Log Normal',
    'loggamma': 'Log Gamma',
    'expon': 'Exponential',
};

const EDIT_MODES = {
    DISTRIBUTION: 'distribution',
    ROULETTE: 'roulette'
}

export const ParameterPlot = ({ parameter }) => {
    const { parametersDict, updateParameter } = useContext(VariableContext);
    const [editMode, setEditMode] = useState(EDIT_MODES.ROULETTE);
    const [showFittedDistribution, setShowFittedDistribution] = useState(false);
    const [isFitting, setIsFitting] = useState(false);

    const svgHeightRef = useRef(0);
    const svgWidthRef = useRef(0);
    const margin = { top: 10, bottom: 40, left: 40, right: 40 };
    const labelOffset = 35;

    useEffect(() => {
        drawPlot();
        plotRoulette();
        if (parameter.selectedDistributionIdx !== null) {
            plotDistribution(parametersDict[parameter.name].distributions[parameter.selectedDistributionIdx]);
        }
    }, [parameter]);

    const drawPlot = () => {
        const container = d3.select(`#parameter-container-${parameter.name}`);
        container.html('');

        const svgHeight = container.node().clientHeight;
        svgHeightRef.current = svgHeight;

        const svgWidth = container.node().clientWidth;
        svgWidthRef.current = svgWidth;

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

        const chartWidth = svgWidthRef.current - margin.left - margin.right;
        const chartHeight = svgHeightRef.current - margin.top - margin.bottom;

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

        const chartWidth = svgWidthRef.current - margin.left - margin.right;
        const chartHeight = svgHeightRef.current - margin.top - margin.bottom;

        // Create scales
        const xScale = d3.scaleLinear()
            .domain([parameter.min, parameter.max])
            .range([0, chartWidth]);

        let binInfos = [];
        for (let index = 0; index < parameter.binEdges.length - 1; index++) {
            const leftEdge = parameter.binEdges[index];
            const rightEdge = parameter.binEdges[index + 1];
            const binPoints = parameter.roulettePoints.filter(p => p >= leftEdge && p < rightEdge);
            binInfos.push({ points: binPoints, height: binPoints.length });
        }

        const maxY = d3.max(binInfos.map(d => d.height)) < 8 ? 10 : d3.max(binInfos.map(d => d.height)) + 2;
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
                const binCnt = binInfos[bin].height;
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
                        if (deltaHeight > 0) {
                            let newPoints = [];
                            for (let i = 0; i < deltaHeight; i++) {
                                newPoints.push(Math.random() * (parameter.binEdges[bin + 1] - parameter.binEdges[bin]) + parameter.binEdges[bin]);
                            }
                            binInfos[bin].points.push(...newPoints);
                        }
                        // if clicked count is smaller than or equal to previous
                        else if (deltaHeight === 0) {
                            binInfos[bin].points.pop();
                        }
                        else {
                            binInfos[bin].points = binInfos[bin].points.slice(0, grid);
                        }

                        updateParameter(parameter.name, { roulettePoints: binInfos.map(d => d.points).flat() });
                    });
            }
        }
    };

    const getDistributionNotation = (dist) => {
        const params = dist.params;
        switch (DISTRIBUTION_TYPES[dist.name]) {
            case DISTRIBUTION_TYPES.uniform:
                return `X ~ Uniform(a = ${params.loc}, b = ${params.loc + params.scale})`;
            case DISTRIBUTION_TYPES.norm:
                return `X ~ Normal(μ = ${params.loc}, σ = ${params.scale})`;
            case DISTRIBUTION_TYPES.t:
                return `X ~ Student-t(ν = ${params.df}, μ = ${params.loc}, σ = ${params.scale})`;
            case DISTRIBUTION_TYPES.gamma:
                return `X ~ Gamma(α = ${params.a}, β = ${(1 / params.scale).toFixed(2)})`;
            case DISTRIBUTION_TYPES.beta:
                return `X ~ Beta(${params.a}, ${params.b}, loc = ${params.loc}, scale = ${params.scale})`;
            case DISTRIBUTION_TYPES.skewnorm:
                return `X ~ Skew Normal(μ = ${params.loc}, σ = ${params.scale}, α = ${params.a})`;
            case DISTRIBUTION_TYPES.lognorm:
                return `X ~ Log-Normal(μ = ${Math.log(params.scale).toFixed(2)}, σ = ${params.s})`;
            case DISTRIBUTION_TYPES.loggamma:
                return `X ~ Log-Gamma(μ = ${Math.log(params.scale).toFixed(2)}, σ = ${params.s})`;
            case DISTRIBUTION_TYPES.expon:
                return `X ~ Exponential(λ = ${(1 / params.scale).toFixed(2)})`;
            default:
                return `Unknown distribution`;
        }
    }

    const fitDistribution = () => {
        setIsFitting(true);

        axios
            .post(window.BACKEND_ADDRESS + "/fitDistribution", {
                samples: parameter.roulettePoints
            })
            .then((response) => {
                console.log(response.data);
                updateParameter(parameter.name, {
                    distributions: response.data.distributions,
                    selectedDistributionIdx: 0
                });
                plotDistribution(response.data.distributions[0]);
            })
            .finally(() => {
                setIsFitting(false);
                setShowFittedDistribution(true);
            });
    };

    const onSelectDistribution = (idx) => {
        updateParameter(parameter.name, { selectedDistributionIdx: idx });
        plotDistribution(parametersDict[parameter.name].distributions[idx]);
    }

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Box 
                className="parameter-operation-container"
                sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: 2,
                    width: '40%',
                    height: '100%'
                }}>
                <Typography variant="h6">{parameter.name}</Typography>
                {showFittedDistribution && parametersDict[parameter.name] && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Select
                            value={parametersDict[parameter.name].selectedDistributionIdx}
                            onChange={(e) => onSelectDistribution(e.target.value)}
                        >
                            {parametersDict[parameter.name].distributions.map((dist, idx) => (
                                <MenuItem key={idx} value={idx}>{DISTRIBUTION_TYPES[dist.name]}</MenuItem>
                            ))}
                        </Select>
                        <Typography variant="body2" color="text.secondary">
                            {getDistributionNotation(parametersDict[parameter.name].distributions[parametersDict[parameter.name].selectedDistributionIdx])}
                        </Typography>
                    </Box>
                )}

                {isFitting ? (
                    <CircularProgress />
                ) : (
                    <Button
                        size="small"
                        variant="contained"
                        onClick={fitDistribution}
                        disabled={parameter.roulettePoints.length === 0}
                    >
                        Fit Distribution
                    </Button>
                )}
            </Box>

            <Box 
                id={`parameter-container-${parameter.name}`} 
                sx={{
                    width: '60%',
                    height: '100%',
                }}
            />
        </Box>
    );
};