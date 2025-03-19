import React, { useState, useRef, useEffect, forwardRef, useContext } from 'react';
import * as d3 from 'd3';
import axios from "axios";
import { Alert, Box, Button, Checkbox, FormControl, FormControlLabel, FormLabel, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Radio, RadioGroup, Snackbar, Switch, ToggleButton, Typography } from '@mui/material';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import { DndContext, closestCenter, DragOverlay, useSensors, useSensor, PointerSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import "./ParallelSankeyPlot.css";
import { WorkspaceContext } from '../contexts/WorkspaceContext';
import { VariableContext } from '../contexts/VariableContext';
import { EntityContext } from '../contexts/EntityContext';
import { SelectionContext, SELECTION_SOURCES } from '../contexts/SelectionContext';

/**
 * Define interaction types
 * 
 * TYPES:
 * - COMPLETE: For exploring complete entities
 * - INCOMPLETE: For exploring incomplete entities
 */
const FILTER_TYPES = {
    COMPLETE: "complete",
    INCOMPLETE: "incomplete"
}

export default function ParallelSankeyPlot() {
    const { leftPanelOpen, rightPanelOpen } = useContext(WorkspaceContext);
    const { variablesDict, updateVariable, sortableVariables } = useContext(VariableContext);
    const { entities, addEntities, deleteEntities, combineEntities } = useContext(EntityContext);
    const { activeFilter, setActiveFilter, selections, selectedEntities, setSelectedEntities, isHidden, selectionsRef, updateSelections, selectionSource } = useContext(SelectionContext);

    const marginTop = 20;
    const marginBottom = 10;
    const marginRight = 50;
    const marginLeft = 50;
    const labelOffset = 20;

    const [connectedPoint, setConnectedPoint] = useState(null);
    const [generatedNum, setGeneratedNum] = useState(5);

    const [warningMessage, setWarningMessage] = useState("");

    const chartHeightRef = useRef(0);
    const valueAxesRef = useRef(new Map());
    const variableAxesRef = useRef(null);
    const [draggedItem, setDraggedItem] = useState(null);

    // TODO: selection should be a context variable -> same color encoding for all plots
    const [selectionGroup1Entities, setSelectionGroup1Entities] = useState([]);
    const [selectionGroup2Entities, setSelectionGroup2Entities] = useState([]);
    const frozenAxesRef = useRef(new Set());

    const SELECTION_STEPS = {
        INITIAL: 0,
        SELECT_G1: 1,
        SELECT_G2: 2,
        LINK: 3
    }
    const [selectionStep, setSelectionStep] = useState(SELECTION_STEPS.INITIAL);

    useEffect(() => {
        drawPlot();
        populateEntities();
    }, [leftPanelOpen, rightPanelOpen, variablesDict]);

    useEffect(() => {
        populateEntities();
    }, [entities]);

    useEffect(() => {
        const fromExternal = selectionSource === SELECTION_SOURCES.BIVARIATE;
        const newSelectedEntities = updateHighlightedEntities(fromExternal);
        if (!fromExternal) {
            setSelectedEntities(newSelectedEntities);
        }
    }, [activeFilter, selections]);

    const drawPlot = () => {
        const container = d3.select("#plot-container");
        const interactionModeBox = d3.select("#interaction-mode-box");
        const sortableContainer = d3.select("#sortable-container");
        const plotDiv = d3.select("#sankey-div");
        plotDiv.html("");

        const containerHeight = container.node().clientHeight;
        const interactionModeBoxHeight = interactionModeBox.node().clientHeight;
        const sortableContainerHeight = sortableContainer.node().clientHeight;

        const svgWidth = plotDiv.node().clientWidth;
        const svgHeight = containerHeight - interactionModeBoxHeight - sortableContainerHeight;
        let svg = plotDiv.append("svg")
            .attr("id", "sankey-svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight);
        let chart = svg.append("g")
            .attr("id", "pcp")
            .attr("transform", `translate(${marginLeft}, ${marginTop})`);
        let chartWidth = svgWidth - marginLeft - marginRight;
        let chartHeight = svgHeight - marginTop - marginBottom;
        chartHeightRef.current = chartHeight;

        const newValueAxes = new Map(Object.entries(variablesDict).map(([varName, variable]) => {
            const dataRange = variable.max - variable.min;
            const padding = dataRange * 0.1;

            return [
                varName,
                {
                    scale: d3.scaleLinear()
                        .domain([variable.min - padding, variable.max + padding])
                        .range([chartHeight, 0]),
                    originalDomain: [variable.min, variable.max]
                }
            ];
        }));

        const newVariableAxes = d3.scalePoint()
            .domain(
                Object.values(variablesDict)
                    .sort((a, b) => a.sequenceNum - b.sequenceNum) // Sort by arranged sequence number
                    .map(d => d.name))
            .range([0, chartWidth]);

        // Append the axis for each key.
        chart.append("g")
            .selectAll("g")
            .data(Object.entries(variablesDict).map(([varName, variable]) => varName))
            .join("g")
            .attr("class", "axis")
            .attr("id", d => `axis-${d}`)
            .attr("transform", d => `translate(${newVariableAxes(d)}, 0)`)
            .each(function (d) {
                const axisGroup = d3.select(this);
                const axisGenerator = d3.axisLeft(newValueAxes.get(d).scale);
                axisGroup.call(axisGenerator);
                const [min, max] = newValueAxes.get(d).originalDomain;

                // Get the y positions for the original min and max
                const yMin = newValueAxes.get(d).scale(min);
                const yMax = newValueAxes.get(d).scale(max);

                // Add dashed lines for padding regions
                axisGroup.append("line")
                    .attr("class", "axis-padding")
                    .attr("x1", 0)
                    .attr("x2", 0)
                    .attr("y1", chartHeight)
                    .attr("y2", yMin)
                    .style("stroke", "#999")
                    .style("stroke-dasharray", "2,2");

                axisGroup.append("line")
                    .attr("class", "axis-padding")
                    .attr("x1", 0)
                    .attr("x2", 0)
                    .attr("y1", 0)
                    .attr("y2", yMax)
                    .style("stroke", "#999")
                    .style("stroke-dasharray", "2,2");

                // Add solid line for main region
                axisGroup.append("line")
                    .attr("class", "axis-main")
                    .attr("x1", 0)
                    .attr("x2", 0)
                    .attr("y1", yMax)
                    .attr("y2", yMin)
                    .style("stroke", "black");

                // Style the ticks based on whether they're in the padding region
                axisGroup.selectAll(".tick")
                    .each(function (tickValue) {
                        if (tickValue < min || tickValue > max) {
                            d3.select(this)
                                .select("line")
                                .style("stroke", "#999")
                                .style("stroke-dasharray", "2,2");
                            d3.select(this)
                                .select("text")
                                .style("fill", "#999");
                        }
                    });

                // Remove the original axis line
                axisGroup.select(".domain").remove();

                // Add draggable handles at min and max
                const handleWidth = 20;
                const handleHeight = 8;

                // Create drag behavior
                const drag = d3.drag()
                    .on("drag", function (event, type) {
                        const handle = d3.select(this);
                        const newY = Math.min(Math.max(0, event.y), chartHeight);
                        handle.attr("transform", `translate(0, ${newY})`);

                        // Update the value label
                        const value = newValueAxes.get(d).scale.invert(newY);
                        handle.select("text")
                            .text(value.toFixed(2));
                    })
                    .on("end", function (event) {
                        const handle = d3.select(this);
                        const newY = Math.min(Math.max(0, event.y), chartHeight);
                        const newValue = newValueAxes.get(d).scale.invert(newY);

                        // Determine if this is min or max handle based on y position
                        const [currentMin, currentMax] = newValueAxes.get(d).originalDomain;
                        const isMinHandle = Math.abs(newValueAxes.get(d).scale(currentMin) - newY) <
                            Math.abs(newValueAxes.get(d).scale(currentMax) - newY);

                        // Update the variable's range
                        if (isMinHandle) {
                            updateVariable(d, {
                                min: newValue,
                                max: currentMax
                            });
                        } else {
                            updateVariable(d, {
                                min: currentMin,
                                max: newValue
                            });
                        }
                    });

                // Add min handle
                const minHandle = axisGroup.append("g")
                    .attr("class", "axis-handle")
                    .attr("transform", `translate(0, ${yMin})`)
                    .call(drag)
                    .on("mouseover", function () {
                        // trigger a tooltip
                        d3.select(this)
                            .append("title")
                            .text(() => {
                                const y = d3.select(this).attr("transform").match(/translate\(0,\s*([^)]+)\)/)[1];
                                return `Min: ${newValueAxes.get(d).scale.invert(y).toFixed(2)}`;
                            });
                    })
                    .on("mouseout", function () {
                        // hide the tooltip
                        d3.select(this).select("title").remove();
                    });

                minHandle.append("rect")
                    .attr("x", -handleWidth / 2)
                    .attr("y", -handleHeight / 2)
                    .attr("width", handleWidth)
                    .attr("height", handleHeight)

                // Add max handle
                const maxHandle = axisGroup.append("g")
                    .attr("class", "axis-handle")
                    .attr("transform", `translate(0, ${yMax})`)
                    .call(drag)
                    .on("mouseover", function () {
                        // trigger a tooltip
                        d3.select(this)
                            .append("title")
                            .text(() => {
                                const y = d3.select(this).attr("transform").match(/translate\(0,\s*([^)]+)\)/)[1];
                                return `Max: ${newValueAxes.get(d).scale.invert(y).toFixed(2)}`;
                            });
                    })
                    .on("mouseout", function () {
                        // hide the tooltip
                        d3.select(this).select("title").remove();
                    });

                maxHandle.append("rect")
                    .attr("x", -handleWidth / 2)
                    .attr("y", -handleHeight / 2)
                    .attr("width", handleWidth)
                    .attr("height", handleHeight)
            })

        // Update references but use only the scale part
        valueAxesRef.current = new Map(Array.from(newValueAxes.entries()).map(([key, value]) => [key, value.scale]));
        variableAxesRef.current = newVariableAxes;
    }

    const changeFilterMode = (filterType) => {
        console.log("Change interaction mode to: ", filterType);
        clearBrushSelection();
        setActiveFilter(filterType);
    }

    const clearBrushSelection = (reset = false) => {
        console.log("Clear brush selection", reset);
        const chart = d3.select("#pcp");

        // Clear brush selection
        const brushes = chart.selectAll(".brush");
        if (!reset && selectionStep === SELECTION_STEPS.SELECT_G1) {
            const selectedAxes = Object.keys(selectedEntities[0]).filter(key => key !== "id" && selectedEntities[0][key] !== null);

            brushes.each(function (d) {
                if (selectedAxes.includes(d)) {
                    // Change the axis color to indicate it's frozen
                    d3.selectAll(`#axis-${d}`)
                        .classed("frozen-axis", true);

                    const axisX = variableAxesRef.current(d);
                    chart.append("text")
                        .attr("class", "frozen-indicator")
                        .attr("x", axisX + 15)
                        .attr("y", marginTop - 5)
                        .attr("dy", ".35em")
                        .text("🔒")
                        .style("font-size", "12px");

                    frozenAxesRef.current.add(d);
                }
                else {
                    d3.select(this).call(d3.brush().move, null);
                }
            });
        } else {
            brushes.call(d3.brush().move, null);
            chart.selectAll(".selection-count-label").remove();
            chart.selectAll(".frozen-indicator").remove();
            chart.selectAll(".axis").classed("frozen-axis", false);
            frozenAxesRef.current.clear();
        }

        selectionsRef.current = new Map();
        updateSelections(selectionsRef.current, SELECTION_SOURCES.PARALLEL);

        // Clear selected entities
        setSelectedEntities([]);
    }

    const populateEntities = () => {
        console.log("Populate entities in PCP", entities);

        const chart = d3.select("#pcp");

        const line = d3.line()
            .x(([key]) => variableAxesRef.current(key))
            .y(([key, value]) => valueAxesRef.current.get(key)(value));

        chart.selectAll(".entity-path").remove();
        chart.selectAll(".entity-dot").remove();

        Object.values(entities).forEach(entity => {
            Object.entries(entity).filter(([key, value]) => key !== "id" && value !== null).forEach(([key, value]) => {
                chart.append("circle")
                    .attr("class", "entity-dot")
                    .attr("id", `dot_${entity["id"]}_${key}`)
                    .attr("cx", variableAxesRef.current(key))
                    .attr("cy", valueAxesRef.current.get(key)(value))
                    .attr("r", 4)

            });

            chart.append("path")
                .datum(entity) // Pass the entity directly
                .attr("class", "entity-path")
                .attr("id", `entity_path_${entity["id"]}`)
                .attr("d", d => line(
                    sortableVariables
                        .filter(variable => d[variable.name] !== null)
                        .map(variable => [variable.name, d[variable.name]])
                ))
        });

        activateBrushFeature();
        updateHighlightedEntities();
    }

    const activateBrushFeature = () => {
        const chart = d3.select("#pcp");
        const brushWidth = 50;

        const brush = d3.brushY()
            .extent([
                [-(brushWidth / 2), marginTop],
                [brushWidth / 2, chartHeightRef.current]
            ])
            .on("start brush end", (event, key) => {
                if (event.sourceEvent === null || frozenAxesRef.current.has(key)) return false;
                brushed(event, key);
            });

        // Apply brush to axis groups
        chart.selectAll(".axis")
            .append("g")
            .attr("class", "brush")
            .attr("id", d => `brush-${d}`)
            .call(brush)
            .call(brush.move, null);

        function brushed(event, key) {
            const { selection } = event;
            const currentSelections = new Map(selectionsRef.current);

            if (selection === null) {
                currentSelections.delete(key);
                chart.select(`#count-label-${key}`).remove();
            } else {
                currentSelections.set(key, selection.map(valueAxesRef.current.get(key).invert));
            }

            selectionsRef.current = currentSelections;
            updateSelections(selectionsRef.current, SELECTION_SOURCES.PARALLEL);
        }
    }

    const updateHighlightedEntities = (fromExternal = false) => {
        let chart = d3.select("#pcp");
        const newSelectedEntities = [];
        const countsByAxis = new Map();
        Array.from(selectionsRef.current.keys()).forEach(axis => countsByAxis.set(axis, 0));

        // First get all entities that would be selected based on current brush
        const potentialSelectedEntities = Object.entries(entities).filter(([entityId, entity]) => {
            if (selectionGroup1Entities.includes(entity) || selectionGroup2Entities.includes(entity)) return false;
            if (isHidden(entity)) return false;

            return selectionsRef.current.size !== 0 && Array.from(selectionsRef.current).every(([key, [max, min]]) => {
                if (entity[key] === null) return false;
                return entity[key] >= min && entity[key] <= max;
            });
        }).map(([id, entity]) => ({ id, entity }));

        let selectedEntitiesForHighlight = potentialSelectedEntities;
        // When group 1 have partial connected entities, select entities with more non-null values
        if (selectionStep === SELECTION_STEPS.SELECT_G1) {
            const mostNonNullCnt = Math.max(...potentialSelectedEntities.map(d => Object.values(d.entity).filter(value => value !== null).length));
            selectedEntitiesForHighlight = potentialSelectedEntities.filter(d => Object.values(d.entity).filter(value => value !== null).length === mostNonNullCnt);
        }
        // When group 2 have more entities than group 1, randomly select subset
        else if (selectionStep === SELECTION_STEPS.SELECT_G2 &&
            potentialSelectedEntities.length > selectionGroup1Entities.length) {
            // Randomly select entities to match group 1 size
            const shuffled = [...potentialSelectedEntities];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            selectedEntitiesForHighlight = shuffled.slice(0, selectionGroup1Entities.length);
        }

        // Create a Set of selected entity IDs for quick lookup
        const selectedEntityIds = new Set(selectedEntitiesForHighlight.map(item => item.id));

        Object.entries(entities).forEach(([entityId, entity]) => {
            if (selectionGroup1Entities.includes(entity) || selectionGroup2Entities.includes(entity)) return;

            const isEntityHidden = isHidden(entity);
            const isSelected = selectedEntityIds.has(entityId);

            if (isEntityHidden) {
                d3.select(`#entity_path_${entityId}`)
                    .classed("hidden-selection", true)
                    .classed("brush-non-selection", false)
                    .classed("brush-selection", false)
                    .classed("group-1-selection", false)
                    .classed("group-2-selection", false);

                Object.entries(entity).forEach(([key, value]) => {
                    if (key !== "id" && value !== null) {
                        d3.select(`#dot_${entityId}_${key}`)
                            .classed("hidden-entity-dot", true)
                            .classed("selected-entity-dot", false)
                            .classed("unselected-entity-dot", false)
                            .classed("group-1-dot", false)
                            .classed("group-2-dot", false);
                    }
                });
            } else {
                d3.select(`#entity_path_${entityId}`)
                    .classed("hidden-selection", false)
                    .classed("brush-non-selection", !isSelected)
                    .classed("brush-selection", isSelected)
                    .classed("group-1-selection", isSelected && selectionStep === SELECTION_STEPS.SELECT_G1)
                    .classed("group-2-selection", isSelected && selectionStep === SELECTION_STEPS.SELECT_G2);

                if (isSelected) {
                    newSelectedEntities.push(entity);
                }

                Object.entries(entity).forEach(([key, value]) => {
                    if (key !== "id" && value !== null) {
                        d3.select(`#dot_${entityId}_${key}`)
                            .classed("hidden-entity-dot", false)
                            .classed("selected-entity-dot", isSelected)
                            .classed("unselected-entity-dot", !isSelected)
                            .classed("group-1-dot", isSelected && selectionStep === SELECTION_STEPS.SELECT_G1)
                            .classed("group-2-dot", isSelected && selectionStep === SELECTION_STEPS.SELECT_G2);

                        if (isSelected) {
                            countsByAxis.set(key, countsByAxis.get(key) + 1);
                        }
                    }
                });
            }
        });

        // Update count labels for each axis
        countsByAxis.forEach((count, axis) => {
            // Remove existing label
            chart.select(`#count-label-${axis}`).remove();
            chart.select(`#brush-selection-overlay-${axis}`).remove();
            // Add new label if there's a selection
            if (selectionsRef.current.has(axis)) {
                const axisX = variableAxesRef.current(axis);
                const axisY = valueAxesRef.current.get(axis);
                const [selectionY1, selectionY2] = selectionsRef.current.get(axis);

                // Add overlay rectangle matching corresponding brush selection
                if (fromExternal) {
                    // chart.append("rect")
                    //     .attr("id", `brush-selection-overlay-${axis}`)
                    //     .attr("class", "brush-selection-overlay")
                    //     .attr("x", axisX - 25)
                    //     .attr("y", axisY(Math.max(selectionY1, selectionY2)))
                    //     .attr("width", 50)
                    //     .attr("height", Math.abs(axisY(selectionY1) - axisY(selectionY2)))
                    //     .attr("opacity", 0.2);
                }
                else {
                    const labelY = (selectionY1 + selectionY2) / 2; // Middle of brush selection
                    chart.append("text")
                        .attr("id", `count-label-${axis}`)
                        .attr("class", "selection-count-label")
                        .attr("x", axisX + 15)
                        .attr("y", axisY(labelY))
                        .attr("dy", ".35em") // Vertical alignment
                        .text(`n = ${count}`)
                        .attr('font-size', '12px');
                }
            }
        });

        chart.selectAll(".unselected-entity-dot").raise();
        chart.selectAll(".selected-entity-dot").raise();
        chart.selectAll(".selection-count-label").raise();
        chart.selectAll(".axis-handle").raise();

        return newSelectedEntities;
    }

    // Randomly populate data points in the selected region
    const generateRandomEntities = () => {
        const newEntitiesData = [];
        for (let i = 0; i < generatedNum; i++) {
            let entityData = {};
            Array.from(selectionsRef.current).forEach(([varName, range]) => {
                const [min, max] = range;
                const randomValue = Math.random() * (max - min) + min;
                entityData[varName] = randomValue;
            });
            newEntitiesData.push(entityData);
        }

        clearBrushSelection();
        addEntities(newEntitiesData);
    }

    const deleteSelectedEntities = () => {
        deleteEntities(selectedEntities.map(entity => entity.id));
    }

    const confirmSelection = () => {
        if (selectionStep === SELECTION_STEPS.SELECT_G1) {
            if (selectedEntities.length === 0) {
                setWarningMessage("Please select entities for Group 1");
                return;
            }
            setSelectionGroup1Entities(selectedEntities);
            clearBrushSelection();
        } else if (selectionStep === SELECTION_STEPS.SELECT_G2) {
            if (selectedEntities.length === 0) {
                setWarningMessage("Please select entities for Group 2");
                return;
            }
            setSelectionGroup2Entities(selectedEntities);
            clearBrushSelection();
        }

        setSelectionStep((prev) => prev + 1);
    }

    const resetSelection = () => {
        setSelectionStep(SELECTION_STEPS.INITIAL);
        setSelectionGroup1Entities([]);
        setSelectionGroup2Entities([]);
        clearBrushSelection(true);
    }

    const connectEntities = () => {
        const entities1 = [...selectionGroup1Entities];
        const entities2 = [...selectionGroup2Entities];

        // Return if either group is empty
        if (entities1.length === 0 || entities2.length === 0) {
            return;
        }

        // Check if groups have equal length
        if (entities1.length !== entities2.length) {
            setWarningMessage("Both selection groups must have the same number of entities");
            return;
        }

        const newEntities = [];
        const entitiesToDelete = [];

        // Combine all pairs
        while (entities1.length > 0) {
            // Randomly select one entity from each group without replacement
            const randomIndex1 = Math.floor(Math.random() * entities1.length);
            const randomIndex2 = Math.floor(Math.random() * entities2.length);
            const randomEntity1 = entities1.splice(randomIndex1, 1)[0];
            const randomEntity2 = entities2.splice(randomIndex2, 1)[0];

            // Combine the entities
            let combinedEntityData = {};
            Object.keys(variablesDict).forEach((varName) => {
                const value1 = randomEntity1[varName];
                const value2 = randomEntity2[varName];

                if (value1) {
                    combinedEntityData[varName] = value1;
                } else if (value2) {
                    combinedEntityData[varName] = value2;
                } else {
                    combinedEntityData[varName] = null;
                }
            });

            newEntities.push(combinedEntityData);
            entitiesToDelete.push(randomEntity1.id, randomEntity2.id);
        }

        // Use the new combineEntities function instead of separate delete and add
        combineEntities(entitiesToDelete, newEntities);

        // After connection is complete, reset the step
        setSelectionGroup1Entities([]);
        setSelectionGroup2Entities([]);
        setSelectionStep(0);
    }

    const handleDragStart = (event) => {
        setDraggedItem(event.active.id);
    }

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = sortableVariables.findIndex(item => item.name === active.id);
            const newIndex = sortableVariables.findIndex(item => item.name === over.id);

            const newItems = arrayMove(sortableVariables, oldIndex, newIndex);
            newItems.forEach((item, index) => {
                updateVariable(item.name, {
                    "sequenceNum": index
                });
            });
        }

        setDraggedItem(null);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    return (
        <Box id="plot-container" sx={{ boxSizing: 'border-box', height: "100%" }}>
            <Box id="interaction-mode-box" sx={{
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                pb: 2
            }}>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    border: '1px solid',
                    borderColor: 'grey.500',
                    borderRadius: 1,
                    p: 1
                }}>
                    <Typography sx={{ mr: 1.5 }}>Interaction Mode:</Typography>
                    <RadioGroup
                        row
                        aria-label="interactionMode"
                        name="interactionMode"
                        value={activeFilter}
                        onChange={(event) => changeFilterMode(event.target.value)}
                    >
                        <FormControlLabel
                            value={FILTER_TYPES.COMPLETE}
                            control={<Radio />}
                            label="Completed"
                        />
                        <FormControlLabel
                            value={FILTER_TYPES.INCOMPLETE}
                            control={<Radio />}
                            label="Incompleted"
                        />
                    </RadioGroup>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', mx: 1, gap: 1 }}>
                    {activeFilter === FILTER_TYPES.INCOMPLETE && (
                        <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                <Button
                                    size='small'
                                    variant={selectionStep === SELECTION_STEPS.INITIAL ? 'outlined' : 'contained'}
                                    color={selectionStep === SELECTION_STEPS.INITIAL ? 'primary' : selectionStep < SELECTION_STEPS.SELECT_G2 ? 'secondary' : 'success'}
                                    onClick={confirmSelection}
                                    disabled={selectionStep > SELECTION_STEPS.SELECT_G2}
                                >
                                    {selectionStep === SELECTION_STEPS.INITIAL ? 'Start Selection' :
                                        selectionStep === SELECTION_STEPS.SELECT_G1 ? 'Confirm Group 1' :
                                            selectionStep === SELECTION_STEPS.SELECT_G2 ? 'Confirm Group 2' :
                                                "Selection Finished"}
                                </Button>
                                <Button
                                    size='small'
                                    variant='outlined'
                                    onClick={resetSelection}
                                >
                                    Reset
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {activeFilter === FILTER_TYPES.COMPLETE && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Button
                                size='small'
                                sx={{ mb: 1 }}
                                variant='outlined'
                                onClick={generateRandomEntities}>
                                Generate
                            </Button>
                            <input
                                type="number"
                                value={generatedNum}
                                onChange={(e) => setGeneratedNum(Number(e.target.value))}
                                min="1"
                                style={{ width: '60px', textAlign: 'center' }}
                            />
                        </Box>
                    )}

                    {activeFilter === FILTER_TYPES.INCOMPLETE && (
                        <Button
                            size='small'
                            variant='contained'
                            color='primary'
                            onClick={() => {
                                connectEntities();
                            }}
                            disabled={selectionStep < SELECTION_STEPS.LINK}
                        >
                            Link
                        </Button>
                    )}

                    <Button
                        size='small'
                        disabled={selectedEntities.length === 0}
                        variant='outlined'
                        onClick={deleteSelectedEntities}>
                        Delete
                    </Button>
                </Box>
            </Box>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                <SortableContext
                    items={sortableVariables}
                    strategy={verticalListSortingStrategy}
                >
                    <Box id='sortable-container' sx={{ width: '100%', minHeight: '40px', display: 'flex', flexDirection: 'row', position: 'relative' }}>
                        {sortableVariables.map(item => {
                            const axisPosition = variableAxesRef.current(item.name) + marginLeft;

                            return (
                                <SortableItem
                                    key={item.name}
                                    id={item.name}
                                    axisPosition={axisPosition}
                                    activeInteraction={activeFilter}
                                />
                            )
                        })}
                    </Box>
                </SortableContext>
                <DragOverlay>
                    {draggedItem ? <Item id={draggedItem} /> : null}
                </DragOverlay>
            </DndContext>

            <Box
                sx={{
                    boxSizing: 'content-box',
                    mx: 'auto',
                    width: '100%',
                }}
                id='sankey-div'
            />

            <Snackbar
                open={warningMessage !== ""}
                autoHideDuration={4000}
                onClose={() => setWarningMessage("")}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    severity="error"
                    sx={{ width: '100%' }}
                >
                    {warningMessage}
                </Alert>
            </Snackbar>
        </Box>
    )
}

export const SortableItem = forwardRef(({ id, axisPosition, activeInteraction }, ref) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id, });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <Item
            ref={setNodeRef}
            id={id}
            axisPosition={axisPosition}
            activeInteraction={activeInteraction}
            style={style}
            {...attributes}
            {...listeners}
        />
    );
});

export const Item = forwardRef(({ id, axisPosition, activeInteraction, ...props }, ref) => {

    return (
        <Box {...props}
            ref={ref}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'absolute',
                left: axisPosition,
                transform: 'translateX(-50%)'
            }}
        >
            <DragHandleIcon size='small' />
            <Typography variant='caption'>{id}</Typography>
        </Box>
    )
});