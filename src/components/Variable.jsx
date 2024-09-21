import React, { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';

// Define the Variable Component
export default function Variable({ variable, updateVariable }) {
    const [counts, setCounts] = useState([]);

    // Draw initial empty histogram
    useEffect(() => {
        console.log("init histogram")
        setCounts(variable.counts);
    }, []);

    useEffect(() => {
        console.log("update counts")
        drawIVHistogram();
    }, [counts])

    const drawIVHistogram = () => {
        const chartWidth = 600;
        const chartHeight = 400;
        const offsetX = 60;
        const offsetY = 60;

        let temporaryCounts = [...counts]; // A temporary copy for live preview

        // Clear the existing SVG
        document.getElementById("iv-distribution-" + variable.name).innerHTML = "";

        let svg = d3.select("#iv-distribution-" + variable.name).append("svg")
            .attr("id", "svg-" + variable.name)
            .attr("width", chartWidth)
            .attr("height", chartHeight);

        let xScale = d3.scaleLinear()
            .domain([variable.min, variable.max])
            .range([offsetX, chartWidth - offsetX]);

        let maxY = d3.max(counts) < 8 ? 10 : d3.max(counts) + 2;
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

        // Draw Y axis
        svg.append('g')
            .attr('transform', `translate(${offsetX}, 0)`)
            .call(d3.axisLeft(yScale))
            .selectAll(".tick text")
            .style("font-size", 15)
            .style("font-family", "Times New Roman");

        // Draw Histogram Bars
        let bars = svg.selectAll('rect')
            .data(temporaryCounts)
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
            .data(temporaryCounts)
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

                // Update the temporary counts array for live preview
                temporaryCounts[index] = newHeight;

                // Update the bar height for live preview
                d3.select(bars.nodes()[index])
                    .attr('y', yScale(newHeight))
                    .attr('height', chartHeight - offsetY - yScale(newHeight));

                // Update the label position and value
                d3.select(labels.nodes()[index])
                    .attr('y', yScale(newHeight) - 10)
                    .text(newHeight);

                // Update the position of the toggle circle
                d3.select(this)
                    .attr('cy', yScale(newHeight));
            })
            .on('end', function (event) {
                // Find the index of the current circle (toggle) being dragged
                const index = d3.select(this).datum();

                // Convert y-coordinate to bin height (rounded to nearest integer)
                let newHeight = Math.round(yScale.invert(event.y));
                newHeight = Math.max(0, Math.min(newHeight, maxY));

                // Update counts array
                let newCounts = [...counts];
                newCounts[index] = newHeight;

                // Set the actual counts
                let newVariable = { ...variable };
                newVariable = { ...newVariable, counts: newCounts };
                updateVariable(newVariable);
                setCounts(newCounts);
            });


        svg.selectAll('circle.toggle')
            .data(d3.range(counts.length))  // Use the index range as data
            .enter()
            .append('circle')
            .attr('class', 'toggle')
            .attr('cx', (d, i) => (xScale(variable.binEdges[i]) + xScale(variable.binEdges[i + 1])) / 2)
            .attr('cy', d => yScale(counts[d]))  // Use counts[d] since d is the index now
            .attr('r', 5)
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