import { Box, FormControl, IconButton, InputLabel, MenuItem, Select, Slider, ToggleButton, Typography, RadioGroup, FormControlLabel, Radio, Button, CircularProgress } from "@mui/material";
import { useState, useEffect, useRef, useContext } from 'react';
import * as d3 from 'd3';
import ReactDOM from 'react-dom';
import axios from 'axios';
import "./ParameterPlot.css";
import { VariableContext, DISTRIBUTION_TYPES } from '../contexts/VariableContext';
import { EntityContext } from '../contexts/EntityContext';
import { InlineMath } from 'react-katex';

export const ParameterPlot = ({ paraName }) => {
    const { parametersDict, updateParameter, getDistributionNotation } = useContext(VariableContext);
    const { entities, recordEntityOperation } = useContext(EntityContext);

    const [parameter, setParameter] = useState(null);
    const [showFittedDistribution, setShowFittedDistribution] = useState(false);
    const [isFitting, setIsFitting] = useState(false);

    const svgHeightRef = useRef(0);
    const svgWidthRef = useRef(0);
    const margin = { top: 20, bottom: 60, left: 60, right: 80 };
    const labelOffset = 45;

    useEffect(() => {
        if (parametersDict && paraName) {
            setParameter(parametersDict[paraName]);
        }
    }, [parametersDict, paraName]);

    useEffect(() => {
        if (parameter) {
            drawPlot();
            plotRoulette();
            if (parameter.selectedDistributionIdx !== null) {
                setShowFittedDistribution(true);
                plotDistribution(parametersDict[parameter.name].distributions[parameter.selectedDistributionIdx]);
            }
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

        const yMax = Math.min(d3.max(distribution.p), 1);
        const yPadding = Math.min(yMax * 0.1, 1 - yMax);
        const y = d3.scaleLinear()
            .domain([0, yMax + yPadding])
            .range([chartHeight, 0]);

        const line = d3.line()
            .x(d => x(d[0]))
            .y(d => y(d[1]));

        // Add y-axis
        chart.append('g')
            .attr('transform', `translate(${chartWidth}, 0)`)
            .call(d3.axisRight(y));

        // Add y-axis label
        chart.append("g")
            .attr("transform", `translate(${chartWidth + labelOffset}, ${chartHeight / 2})`)
            .append("text")
            .attr("text-anchor", "middle")
            .attr('transform', 'rotate(-90)')
            .style("font-size", "14px")
            .style("font-family", "Times New Roman")
            .text(`Probability`);

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
            .call(d3.axisBottom(xScale)
                .tickValues(parameter.binEdges)
                .tickFormat(d => {
                    return Number(d.toFixed(2)).toString();
                }))
            .selectAll(".tick text")
            .attr("transform", "rotate(30)")
            .style("text-anchor", "start")

        // Add X axis label
        chart.append("foreignObject")
            .attr("width", 200)
            .attr("height", 50)
            .attr("x", chartWidth / 2 - 50)
            .attr("y", chartHeight + labelOffset - 20)
            .append("xhtml:div")
            .style("text-align", "start")
            .html(`<div id="parameter-x-axis-label-${parameter.name}"></div>`);

        // Use ReactDOM to render the InlineMath component into the foreignObject
        const xAxisLabel = document.getElementById(`parameter-x-axis-label-${parameter.name}`);
        if (xAxisLabel) {
            ReactDOM.render(<InlineMath math={`\\alpha_{${parameter.name.replace('_', '\\_')}}`} />, xAxisLabel);
        }

        // Add y-axis
        chart.append('g')
            .call(d3.axisLeft(yScale));

        // Add y-axis label
        chart.append("g")
            .attr("transform", `translate(${- margin.left / 2}, ${chartHeight / 2})`)
            .append("text")
            .attr("text-anchor", "middle")
            .attr('transform', 'rotate(-90)')
            .style("font-size", "14px")
            .style("font-family", "Times New Roman")
            .text(`Count`);

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

                        const updateType = deltaHeight > 0 ? 'add' : 'remove';
                        const newRoulettePoints = binInfos.map(d => d.points).flat();
                        recordEntityOperation('update', `parameter ${parameter.name}`, null, newRoulettePoints, updateType, { ...entities });
                        updateParameter(parameter.name, { roulettePoints: newRoulettePoints });
                    });
            }
        }
    };

    const fitDistribution = () => {
        setIsFitting(true);

        axios
            .post(window.BACKEND_ADDRESS + "/fitDistribution", {
                samples: parameter.roulettePoints
            })
            .then((response) => {
                console.log(response.data);
                recordEntityOperation('fit', `parameter ${parameter.name}`, null, response.data.distributions, `distribution fitting`, { ...entities });
                recordEntityOperation('select', `parameter ${parameter.name}`, null, response.data.distributions[0], `distribution selection`, { ...entities });
                updateParameter(parameter.name, {
                    distributions: response.data.distributions,
                    selectedDistributionIdx: 0
                });
                plotDistribution(response.data.distributions[0]);
            })
            .finally(() => {
                setIsFitting(false);
            });
    };

    const onSelectDistribution = (idx) => {
        recordEntityOperation('select', `parameter ${parameter.name}`, null, parametersDict[parameter.name].distributions[idx], `distribution selection`, { ...entities });
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
                <Typography variant="h6"><InlineMath math={`\\alpha_{${paraName.replace('_', '\\_')}}`} /></Typography>
                {showFittedDistribution && parameter && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <Select
                            value={parameter?.selectedDistributionIdx}
                            onChange={(e) => onSelectDistribution(e.target.value)}
                        >
                            {parameter?.distributions.map((dist, idx) => (
                                <MenuItem key={idx} value={idx}>{DISTRIBUTION_TYPES[dist.name]}</MenuItem>
                            ))}
                        </Select>
                        <Typography variant="body2" color="text.secondary">
                            {getDistributionNotation(parameter?.distributions[parameter?.selectedDistributionIdx])}
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
                        disabled={parameter?.roulettePoints?.length === 0}
                    >
                        Fit Distribution
                    </Button>
                )}
            </Box>

            <Box
                id={`parameter-container-${paraName}`}
                sx={{
                    width: '60%',
                    height: '100%',
                }}
            />
        </Box>
    );
};