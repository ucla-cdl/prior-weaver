import { Container, Typography, Box, Button, Paper, Grid2 } from '@mui/material';
import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";

const data = [79, 54, 74, 62, 85, 55, 88, 85, 51, 85, 54, 84, 78, 47, 83, 52, 62, 84, 52, 79, 51, 47, 78, 69, 74, 83, 55, 76, 78, 79, 73, 77, 66, 80, 74, 52, 48, 80, 59, 90, 80, 58, 84, 58, 73, 83, 64, 53, 82, 59, 75, 90, 54, 80, 54, 83, 71, 64, 77, 81, 59, 84, 48, 82, 60, 92, 78, 78, 65, 73, 82, 56, 79, 71, 62, 76, 60, 78, 76, 83, 75, 82, 70, 65, 73, 88, 76, 80, 48, 86, 60, 90, 50, 78, 63, 72, 84, 75, 51, 82, 62, 88, 49, 83, 81, 47, 84, 52, 86, 81, 75, 59, 89, 79, 59, 81, 50, 85, 59, 87, 53, 69, 77, 56, 88, 81, 45, 82, 55, 90, 45, 83, 56, 89, 46, 82, 51, 86, 53, 79, 81, 60, 82, 77, 76, 59, 80, 49, 96, 53, 77, 77, 65, 81, 71, 70, 81, 93, 53, 89, 45, 86, 58, 78, 66, 76, 63, 88, 52, 93, 49, 57, 77, 68, 81, 81, 73, 50, 85, 74, 55, 77, 83, 83, 51, 78, 84, 46, 83, 55, 81, 57, 76, 84, 77, 81, 87, 77, 51, 78, 60, 82, 91, 53, 78, 46, 77, 84, 49, 83, 71, 80, 49, 75, 64, 76, 53, 94, 55, 76, 50, 82, 54, 75, 78, 79, 78, 78, 70, 79, 70, 54, 86, 50, 90, 54, 54, 77, 79, 64, 75, 47, 86, 63, 85, 82, 57, 82, 67, 74, 54, 83, 73, 73, 88, 80, 71, 83, 56, 79, 78, 84, 58, 83, 43, 60, 75, 81, 46, 90, 46, 74];
const width = 600;
const height = 400;
const margin = { top: 20, right: 20, bottom: 20, left: 40 };
const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

export default function Home(props) {

    function plotViolin() {
        let id = "#violin-plot";
        d3.select(id).remove();

        // Create SVG
        const svg = d3.select(id)
            .attr("width", width)
            .attr("height", height);

        const plotGroup = svg.append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        // Define scales
        const xScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, plotWidth]);

        const yScale = d3.scaleLinear()
            .domain([0, 0.1])  // Adjust based on density
            .range([plotHeight, 0]);

        // Kernel density estimator
        const kernelDensityEstimator = (kernel, xValues) => {
            return function (sample) {
                return xValues.map(x => [x, d3.mean(sample, s => kernel(x - s))]);
            };
        };

        const kernelEpanechnikov = bandwidth => {
            return x => Math.abs(x / bandwidth) <= 1
                ? 0.75 * (1 - (x / bandwidth) ** 2) / bandwidth
                : 0;
        };

        const kde = kernelDensityEstimator(kernelEpanechnikov(7), xScale.ticks(50));
        const density = kde(data);

        // Draw the violin plot
        const area = d3.area()
            .x(d => xScale(d[0]))
            .y0(plotHeight / 2)
            .y1(d => yScale(d[1]));

        plotGroup.append("path")
            .datum(density)
            .attr("class", "violin-path")
            .attr("fill", "steelblue")
            .attr("opacity", 0.7)
            .attr("d", area);

        // Add drag behavior
        const drag = d3.drag()
            .on("drag", function (event, d) {
                const newY = yScale.invert(event.y);
                d.y = Math.max(0, Math.min(0.1, newY));
                d3.select(this)
                    .attr("cy", yScale(d.y));

                // Update density and redraw violin
                const updatedDensity = kde(data.map(d => xScale.invert(d.x)));
                plotGroup.select(".violin-path")
                    .datum(updatedDensity)
                    .attr("d", area);
            });

        // Add interactive points
        plotGroup.selectAll(".dot")
            .data(data.map(d => ({ x: xScale(d), y: 0 })))
            .enter()
            .append("circle")
            .attr("class", "dot")
            .attr("fill", "orange")
            .attr("cx", d => d.x)
            .attr("cy", d => yScale(d.y))
            .attr("r", 5)
            .call(drag);
    }

    return (
        <div>
            <svg id='violin-plot'></svg>
        </div>
    );
}