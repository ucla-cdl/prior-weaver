import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { logUserBehavior } from '../utils/BehaviorListener';

// Define the Variable Component
export default function VariablePlot({ variable, updateVariable }) {

    useEffect(() => {
        console.log("draw IV plot");
        drawIVHistogram();
    }, [variable.counts]);

    const drawIVHistogram = () => {
        const chartWidth = 600;
        const chartHeight = 400;
        const offsetX = 60;
        const offsetY = 60;
        const toggleHeight = 8;
        const titleOffset = 50;

        // Clear the existing SVG
        document.getElementById("iv-distribution-" + variable.name).innerHTML = "";

        let svg = d3.select("#iv-distribution-" + variable.name).append("svg")
            .attr("id", "svg-" + variable.name)
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        let xScale = d3.scaleLinear()
            .domain([variable.min, variable.max])
            .range([offsetX, chartWidth - offsetX]);

        let maxY = d3.max(variable.counts) < 8 ? 10 : d3.max(variable.counts) + 2;
        let yScale = d3.scaleLinear()
            .domain([0, maxY])
            .range([chartHeight - offsetY, offsetY]);

        // Draw X axis
        svg.append('g')
            .attr('transform', `translate(0, ${chartHeight - offsetY})`)
            .call(d3.axisBottom(xScale)
                .tickValues(variable.binEdges)
                .tickFormat(d3.format("d")))
            .selectAll(".tick text")
            .style("font-size", 15)
            .style("font-family", "Times New Roman");

        svg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", chartWidth / 2)
            .attr("y", chartHeight - offsetY + titleOffset)
            .style("font-size", "16px")
            .text(variable.name);

        // Draw Y axis
        svg.append('g')
            .attr('transform', `translate(${offsetX}, 0)`)
            .call(d3.axisLeft(yScale))
            .selectAll(".tick text")
            .style("font-size", 15)
            .style("font-family", "Times New Roman");

        // Draw Histogram Bars
        let bars = svg.selectAll('rect')
            .data(variable.counts)
            .enter()
            .append('rect')
            .attr('x', (d, i) => xScale(variable.binEdges[i]))
            .attr('y', d => yScale(d))
            .attr('width', (d, i) => xScale(variable.binEdges[i + 1]) - xScale(variable.binEdges[i]))
            .attr('height', d => chartHeight - offsetY - yScale(d))
            .style('fill', 'lightblue')  // Light color for preview
            .style('stroke', 'black');

        // Add labels on top of bars
        let labels = svg.selectAll('text.label')
            .data(variable.counts)
            .enter()
            .append('text')
            .attr('class', 'label')
            .attr('x', (d, i) => (xScale(variable.binEdges[i]) + xScale(variable.binEdges[i + 1])) / 2)
            .attr('y', d => yScale(d) - 10)
            .attr('text-anchor', 'middle')
            .text(d => d)
            .style('font-size', 14)
            .style('font-family', 'Times New Roman')
            .style('fill', 'black');

        let dragBehavior = d3.drag()
            .on('drag', function (event) {
                // Find the index of the current circle (toggle) being dragged
                const index = d3.select(this).datum();
                // Convert y-coordinate to bin height (rounded to nearest integer)
                let newHeight = Math.round(yScale.invert(event.y));
                // Ensure newHeight is constrained to valid values
                newHeight = Math.max(0, Math.min(newHeight, maxY));
                // Update the bar height
                d3.select(bars.nodes()[index])
                    .attr('y', yScale(newHeight))
                    .attr('height', chartHeight - offsetY - yScale(newHeight));
                // Update the label
                d3.select(labels.nodes()[index])
                    .attr('y', yScale(newHeight) - 10)
                    .text(newHeight);
                // Update the position of the toggle
                d3.select(this)
                    .attr('y', yScale(newHeight) - toggleHeight);
            })
            .on('end', function (event) {
                // Find the index of the current circle (toggle) being dragged
                const index = d3.select(this).datum();
                // Convert y-coordinate to bin height (rounded to nearest integer)
                let newHeight = Math.round(yScale.invert(event.y));
                newHeight = Math.max(0, Math.min(newHeight, maxY));
                // Update counts array
                let newCounts = [...variable.counts];
                logUserBehavior(`uni-plot(${variable.name})`, "drag", `adjust distribution at bin-${index}`, `${newCounts[index]} -> ${newHeight}`)
                newCounts[index] = newHeight;
                updateVariable(variable.name, "counts", newCounts);
            });

        svg.selectAll('rect.toggle')
            .data(d3.range(variable.counts.length))  // Use the index range as data
            .enter()
            .append('rect')
            .attr('class', 'toggle')
            .attr('x', d => xScale(variable.binEdges[d]))
            .attr('y', d => yScale(variable.counts[d]) - toggleHeight)  // Use counts[d] since d is the index now
            .attr('width', d => xScale(variable.binEdges[d + 1]) - xScale(variable.binEdges[d]))
            .attr('height', toggleHeight)
            .attr('rx', 5)
            .attr('fill', 'white')
            .attr('stroke', 'black')
            .attr('stroke-width', '1px')
            .call(dragBehavior);
    }

    return (
        <div>
            <div id={"iv-distribution-" + variable.name}></div>
        </div>
    );
};