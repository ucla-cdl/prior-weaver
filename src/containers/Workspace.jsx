import React, { useState, useRef, useEffect } from 'react';
import "./Workspace.css";
import { Button, Box, Select, MenuItem, Grid2, Backdrop, CircularProgress, InputLabel, FormControl, Tabs, Tab, Typography, MenuList, Paper, BottomNavigation, BottomNavigationAction, Tooltip, IconButton, TextField, Slide } from '@mui/material';
import VariablePlot from '../components/VariablePlot';
import BiVariablePlot from '../components/BiVariablePlot';
import ConceptualModel from '../components/ConceptualModel';
import BrushIcon from '@mui/icons-material/Brush';
import ParallelSankeyPlot from '../components/ParallelSankeyPlot';
import { v4 as uuidv4 } from 'uuid';
import ResultsPanel from '../components/ResultsPanel';
import axios from 'axios';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import UndoIcon from '@mui/icons-material/Undo';

const context = {
    "human_growth_model": "During the early stages of life the stature of female and male are about the same,\
                but their stature start to clearly to differ during growth and in the later stages of life.\
                In the early stage man and female are born roughly with the same stature, around 45cm - 55cm.\
                By the time they are born reaching around 2.5 years old, both male and female present the highest growth rate (centimetres pey year).\
                It is the time they grow the fastest. During this period, man has higher growth rate compared to female.\
                For both male and female there is a spurt growth in the pre-adulthood.\
                For man, this phase shows fast growth rate varying in between 13-17 years old and female varying from 11-15.\
                Also, male tend to keep growing with roughly constant rate until the age of 17-18, while female with until the age of 15-16.\
                After this period of life they tend to stablish their statures mostly around 162 - 190cm and 155 - 178cm respectively.",

    "income_education_age": "Imagine you are a social scientist interested in understanding the factors that influence people's income.\
                Specifically, you want to assess how the number of years of education and a person's age (or employment years) impact their monthly income in the U.S.\
                You aim to use this information to better understand socioeconomic patterns and inform policy recommendations.",
}

const RELATIONS = {
    INFLUENCE: "influences",
    ASSOCIATE: "associates with",
    NONE: "not related to",
};

const DEFAULT_VARIABLE_ATTRIBUTES = {
    min: 0,
    max: 100,
    unitLabel: "",
}

// Main Component for Adding Variables and Histograms
export default function Workspace(props) {
    const bivarRef = useRef();

    const [finishParseCode, setFinishParseCode] = useState(false);
    const [stanCode, setStanCode] = useState('model <- glm(income ~ age + education, family = binomial(link = "logit"))');

    const [model, setModel] = useState('');

    const [variablesDict, setVariablesDict] = useState({});
    const [parametersDict, setParametersDict] = useState({});

    const [bivariateVarName1, setBivariateVarName1] = useState('');
    const [bivariateVarName2, setBivariateVarName2] = useState('');
    const [biVariableDict, setBiVariableDict] = useState({});

    const [biVariable1, setBiVariable1] = useState(null);
    const [biVariable2, setBiVariable2] = useState(null);

    const [entities, setEntities] = useState({});
    const [selectedEntities, setSelectedEntities] = useState([]);

    const [scenario, setScenario] = useState(context["income_education_age"]);

    // Update the state to handle both panels independently
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);

    // Update the initial state for entity history and current version
    const [entityHistory, setEntityHistory] = useState([{
        timestamp: new Date().toISOString(),
        operation: 'initial',
        entitiesAffected: [],
        data: null,
        description: "Initial state",
        previousState: {} // Empty initial state
    }]);
    const [currentVersion, setCurrentVersion] = useState(0); // Start at version 0

    useEffect(() => {
        console.log("Workspace mounted - Backend at ", window.BACKEND_ADDRESS);
    }, []);

    const addVariable = (data) => {
        updateVariable(data.name, data);

        const paramName = `p_${data.name}`;
        setParametersDict((prev) => ({
            ...prev,
            [paramName]: {
                name: paramName,
                relatedVar: data.name,
            }
        }));
    }

    const updateVariable = (name, updates) => {
        console.log("update variable", name, updates);
        let finalUpdates = { ...updates };

        // If min or max is updated, recalculate bin edges
        if ('min' in updates || 'max' in updates) {
            const currentVar = variablesDict[name] || {};
            const newMin = updates.min ?? currentVar.min;
            const newMax = updates.max ?? currentVar.max;

            // Create 10 equally spaced bins
            const binCount = 10;
            const step = (newMax - newMin) / binCount;
            const binEdges = Array.from({ length: binCount + 1 }, (_, i) => newMin + step * i);

            finalUpdates.binEdges = binEdges;
        }

        setVariablesDict(prev => ({
            ...prev,
            [name]: { ...prev[name], ...finalUpdates }
        }));
    }

    const updateBivariable = (name, updates) => {
        console.log("update bivariable", name, updates);
        setBiVariableDict(prev => ({
            ...prev,
            [name]: { ...prev[name], ...updates }
        }));
    }

    const handleStanCode = () => {
        axios.post(window.BACKEND_ADDRESS + '/getStanCodeInfo', {
            code: stanCode
        })
            .then((response) => {
                console.log(response.data);
                const codeInfo = response.data.code_info;
                /**
                 * Parse GLM code
                 * 
                 * Format:
                 * {
                 *  'code': 'model <- glm(outcome ~ age + gender, family = binomial(link = "logit"))',
                 *  'formula': 'outcome ~ age + gender', 
                 *  'response': 'outcome', 
                 *  'predictors': ['age', 'gender'], 
                 *  'family': 'binomial', 
                 *  'link': 'logit'
                 * }
                 */
                Object.entries(codeInfo).forEach(([section, sectionInfo]) => {
                    switch (section) {
                        case "response":
                            updateVariable(sectionInfo, {
                                name: sectionInfo,
                                type: "response",
                                min: DEFAULT_VARIABLE_ATTRIBUTES.min,
                                max: DEFAULT_VARIABLE_ATTRIBUTES.max,
                                unitLabel: DEFAULT_VARIABLE_ATTRIBUTES.unitLabel,
                                sequenceNum: 0
                            });
                            break;
                        case "predictors":
                            console.log("PREDICTORS", sectionInfo);
                            sectionInfo.forEach((predictor, index) => {
                                addVariable({
                                    name: predictor,
                                    type: "predictor",
                                    min: DEFAULT_VARIABLE_ATTRIBUTES.min,
                                    max: DEFAULT_VARIABLE_ATTRIBUTES.max,
                                    unitLabel: DEFAULT_VARIABLE_ATTRIBUTES.unitLabel,
                                    sequenceNum: index + 1
                                });
                            });
                            break;
                        case "code":
                            setModel(sectionInfo);
                            break;
                        default:
                            break;
                    }
                });

                // Add Extra parameters
                setParametersDict((prev) => ({ ...prev, 'intercept': { name: 'intercept', relatedVar: 'intercept' } }));

                // Add bivariate relationship
                let predictors = codeInfo['predictors'];
                let responseVar = codeInfo['response'];
                predictors.forEach((predictor1, index1) => {
                    let biVarName = `${predictor1}-${responseVar}`;
                    console.log("BIVARIABLE", predictor1, biVarName);
                    updateBivariable(biVarName, {
                        name: biVarName,
                        relation: RELATIONS.INFLUENCE,
                        specified: false,
                        predictionDots: [],
                        populateDots: [],
                        chipDots: [],
                        fittedRelation: {},
                    });

                    predictors.forEach((predictor2, index2) => {
                        if (index1 < index2) {
                            biVarName = `${predictor1}-${predictor2}`;
                            console.log("BIVARIABLE", predictor2, biVarName);
                            updateBivariable(biVarName, {
                                name: biVarName,
                                relation: RELATIONS.ASSOCIATE,
                                specified: false,
                                predictionDots: [],
                                populateDots: [],
                                chipDots: [],
                                fittedRelation: {},
                            });
                        }
                    });
                });
            })
            .finally(() => {
                console.log("FINISH PARSE CODE", biVariableDict);
                setFinishParseCode(true);
            })
            .catch((error) => {
                console.log(error);
            });
    }

    // Add an attribute to every entity when adding a variable
    const addAttributeToEntities = (varName) => {
        console.log("Add an Attribute To Entities", varName);
        let newEntities = { ...entities };
        Object.keys(newEntities).forEach((id) => {
            newEntities[id][varName] = null;
        });
        setEntities(newEntities);
    }

    // Update recordEntityOperation to accept newEntities parameter
    const recordEntityOperation = (operation, entitiesAffected, data, description, newEntities) => {
        const historyEntry = {
            timestamp: new Date().toISOString(),
            operation: operation,
            entitiesAffected: entitiesAffected,
            data: data,
            description: description,
            previousState: newEntities // Use the new entities state
        };

        // Remove any future history entries if we're not at the latest version
        const newHistory = [...entityHistory].slice(0, currentVersion + 1);
        
        setEntityHistory([...newHistory, historyEntry]);
        setCurrentVersion((prev) => prev + 1);
        console.log("recordEntityOperation", historyEntry);
    };

    // Update the entity operations to pass the new entities state
    const addEntities = (entitiesData, description = "") => {
        console.log("add entities", entitiesData);
        setEntities((prev) => {
            let newEntities = { ...prev };
            const newEntityIds = [];
            
            entitiesData.forEach((entityData) => {
                const newEntity = {
                    id: uuidv4()
                };
                newEntityIds.push(newEntity.id);
                
                Object.keys(variablesDict).forEach((key) => {
                    newEntity[key] = null;
                });
                Object.entries(entityData).forEach(([key, value]) => {
                    newEntity[key] = value;
                });

                newEntities[newEntity.id] = newEntity;
            });

            // Record the operation with the new entities state
            recordEntityOperation('add', newEntityIds, entitiesData, description, newEntities);
            
            return newEntities;
        });
    }

    const deleteEntities = (entitiesIDs, description = "") => {
        console.log("delete entities", entitiesIDs);
        let newEntities = { ...entities };
        entitiesIDs.forEach((entityID) => {
            delete newEntities[entityID];
        });
        
        // Record the operation with the new entities state
        recordEntityOperation('delete', entitiesIDs, null, description, newEntities);
        
        setEntities(newEntities);
    }

    const combineEntities = (entitiesToDelete, entitiesData, description = "") => {
        // Delete the original entities
        const newEntities = { ...entities };
        entitiesToDelete.forEach(entityId => {
            delete newEntities[entityId];
        });

        // Add the new combined entities
        const newEntityIds = [];
        entitiesData.forEach(entityData => {
            const newEntityId = uuidv4();
            newEntities[newEntityId] = {
                ...entityData,
                id: newEntityId
            };
            newEntityIds.push(newEntityId);
        });

        setEntities(newEntities);
        
        // Record the operation with the new entities state
        recordEntityOperation('combine', entitiesToDelete, entitiesData, description, newEntities);
    }
    
    const updateEntities = (entitiesIDs, entitiesData, description = "") => {
        console.log("update entities", entitiesIDs, entitiesData);
        let newEntities = { ...entities };
        entitiesIDs.forEach((entityID, i) => {
            let entityData = entitiesData[i];
            // If all values in entityData are null, delete the entity
            if (Object.values(entityData).every(value => value === null)) {
                delete newEntities[entityID];
            } else {
                let newEntity = { ...newEntities[entityID] };
                Object.entries(entityData).forEach(([key, value]) => {
                    newEntity[key] = value;
                });
                newEntities[entityID] = newEntity;
            }
        });

        // Record the operation with the new entities state
        recordEntityOperation('update', entitiesIDs, entitiesData, description, newEntities);

        setEntities(newEntities);
    }

    // Optional: Add undo/redo functionality
    const undoEntityOperation = () => {
        if (currentVersion > 0) {
            const previousVersion = entityHistory[currentVersion - 1];
            setEntities(previousVersion.previousState);
            setCurrentVersion(currentVersion - 1);
        }
    };

    const redoEntityOperation = () => {
        if (currentVersion < entityHistory.length - 1) {
            const nextVersion = entityHistory[currentVersion + 1];
            // Apply the operation based on the history entry
            switch (nextVersion.operation) {
                case 'add':
                    setEntities(nextVersion.previousState);
                    break;
                case 'update':
                    setEntities(nextVersion.previousState);
                    break;
                case 'delete':
                    setEntities(nextVersion.previousState);
                    break;
                default:
                    break;
            }
            setCurrentVersion(currentVersion + 1);
        }
    };

    const addToBiVarPlot = (variable) => {
        if (biVariable1 === null) {
            setBiVariable1(variable);
        }
        else if (biVariable2 === null) {
            setBiVariable2(variable);
        }
    }

    // Synchronize the selection of entities in multiple views
    const synchronizeSankeySelection = (selectedEntities) => {
        bivarRef.current?.synchronizeSelection(selectedEntities);
    }

    // Update the getUndoOperationDescription to handle initial state
    const getUndoOperationDescription = () => {
        if (currentVersion <= 0) return "No operation to undo";
        
        const currentOperation = entityHistory[currentVersion];
        const operation = currentOperation.operation;
        if (operation === 'initial') return "Cannot undo initial state";
        
        const count = currentOperation.entitiesAffected.length;
        
        switch (operation) {
            case 'add':
                return `${currentVersion}: Undo adding ${count} ${count === 1 ? 'entity' : 'entities'}`;
            case 'update':
                return `${currentVersion}: Undo updating ${count} ${count === 1 ? 'entity' : 'entities'}`;
            case 'delete':
                return `${currentVersion}: Undo deleting ${count} ${count === 1 ? 'entity' : 'entities'}`;
            default:
                return "Unknown operation";
        }
    };

    return (
        <div className='workspace-div'>
            {!finishParseCode ? (
                // Stage 1: Setup
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    maxWidth: '600px',
                    margin: '0 auto',
                    padding: '20px'
                }}>
                    <Typography variant="h4" gutterBottom>
                        Scenario
                    </Typography>
                    <Typography paragraph sx={{ mb: 4 }}>
                        {scenario}
                    </Typography>
                    <Typography paragraph>
                        Please input your model in R code.
                    </Typography>
                    <TextField
                        id="stan-code"
                        label="R Code"
                        multiline
                        rows={3}
                        variant="outlined"
                        fullWidth
                        sx={{ my: 2 }}
                        value={stanCode}
                        onChange={(e) => setStanCode(e.target.value)}
                    />
                    <Button
                        disabled={!stanCode}
                        onClick={handleStanCode}
                        variant="contained"
                        size="large"
                    >
                        Continue
                    </Button>
                </Box>
            ) : (
                <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', position: 'relative' }}>
                    {/* Left Panel */}
                    <Box
                        className="panel left-panel"
                        sx={{
                            display: leftPanelOpen ? 'block' : 'none',
                            position: 'relative'
                        }}
                    >
                        <div className="context-container">
                            <Typography variant="h6" gutterBottom>Scenario</Typography>
                            <Typography  sx={{ maxHeight: '200px', overflowY: 'auto' }}>{scenario}</Typography>
                        </div>

                        <div className="context-container">
                            <Typography variant="h6" gutterBottom>Model</Typography>
                            <Typography>{model}</Typography>
                        </div>

                        <div className="context-container">
                            <ConceptualModel
                                variablesDict={variablesDict}
                                updateVariable={updateVariable}
                                setVariablesDict={setVariablesDict}
                                biVariable1={biVariable1}
                                setBiVariable1={setBiVariable1}
                                biVariable2={biVariable2}
                                setBiVariable2={setBiVariable2}
                                addToBiVarPlot={addToBiVarPlot}
                                updateBivariable={updateBivariable}
                                addAttributeToEntities={addAttributeToEntities}
                            />
                        </div>

                        {/* Add Relationship List here */}
                        {/* <div className="context-container">
                            <Typography variant="h6" gutterBottom>Relationship List</Typography>
                            <Box sx={{ overflowY: 'auto', maxHeight: 200 }}>
                                {Object.entries(biVariableDict).map(([biVarName, biVariable]) => {
                                    let [varName, relatedVarName] = biVarName.split("-");
                                    return (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'row',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                color: biVariable.specified ? 'green' : 'grey'
                                            }}
                                            key={biVarName}
                                        >
                                            <p><strong>{varName}&nbsp;&nbsp;&nbsp;-</strong></p>
                                            <p><strong>&nbsp;&nbsp;&nbsp;{relatedVarName}</strong></p>
                                            <IconButton sx={{ mx: 1 }} onClick={() => selectBivariable(biVarName)}>
                                                <BrushIcon fontSize='small' />
                                            </IconButton>
                                        </Box>
                                    );
                                })}
                            </Box>
                        </div> */}
                    </Box>

                    {/* Left Panel Toggle Button - shown when left panel is closed */}
                    {!leftPanelOpen && (
                        <IconButton
                            sx={{
                                position: 'fixed',
                                left: '0',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                backgroundColor: 'white',
                                '&:hover': { backgroundColor: '#f0f0f0' },
                                boxShadow: 2,
                                zIndex: 1000,
                                width: '24px',
                                height: '48px',
                                borderRadius: '0 4px 4px 0'
                            }}
                            onClick={() => setLeftPanelOpen(true)}
                        >
                            <ChevronRightIcon />
                        </IconButton>
                    )}

                    {/* Left Panel Toggle Button - shown when left panel is open */}
                    {leftPanelOpen && (
                        <IconButton
                            sx={{
                                position: 'absolute',
                                left: 'calc(20vw - 10px)', // Adjust based on your left panel width
                                top: '50%',
                                transform: 'translateY(-50%)',
                                backgroundColor: 'white',
                                '&:hover': { backgroundColor: '#f0f0f0' },
                                boxShadow: 2,
                                zIndex: 1000,
                                width: '24px',
                                height: '48px',
                                borderRadius: '0 4px 4px 0'
                            }}
                            onClick={() => setLeftPanelOpen(false)}
                        >
                            <ChevronLeftIcon />
                        </IconButton>
                    )}

                    {/* Center Panel */}
                    <Box className="panel center-panel" sx={{ flex: 1 }}>
                        {/* Add the undo button near the top of the center panel */}
                        <Box sx={{ 
                            position: 'absolute', 
                            top: 'calc(39vh - 10px)', 
                            right: rightPanelOpen ? 'calc(25vw + 10px)' : '10px',
                            zIndex: 1000 
                        }}>
                            <Tooltip title={getUndoOperationDescription()}>
                                <span>
                                    <IconButton 
                                        onClick={undoEntityOperation}
                                        disabled={currentVersion <= 0}
                                        size="small"
                                        sx={{
                                            border: '2px solid',
                                            backgroundColor: 'white',
                                            '&:hover': { backgroundColor: '#f0f0f0' },
                                            boxShadow: 1,
                                        }}
                                    >
                                        <UndoIcon />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                        
                        {/* Univariate and Bivariate Plots */}
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'row' }}>
                            <div className="component-container univariate-container">
                                <Typography variant="h6" gutterBottom>Univariate Distributions</Typography>
                                <Box sx={{
                                    boxSizing: 'border-box',
                                    height: 'calc(100% - 32px)',
                                    display: 'flex',
                                    overflowX: 'auto'
                                }}>
                                    {Object.entries(variablesDict).sort((a, b) => a[1].sequenceNum - b[1].sequenceNum).map(([varName, curVar], i) => (
                                        <VariablePlot
                                            key={i}
                                            variablesDict={variablesDict}
                                            variable={curVar}
                                            updateVariable={updateVariable}
                                            entities={entities}
                                            addEntities={addEntities}
                                            updateEntities={updateEntities}
                                            deleteEntities={deleteEntities}
                                        />
                                    ))}
                                </Box>
                            </div>
                            <div className="component-container bivariate-container">
                                <Typography variant="h6" gutterBottom>Bivariate Relationship</Typography>
                                <Box sx={{
                                    boxSizing: 'border-box',
                                    height: 'calc(100% - 32px)',
                                }}>
                                    {biVariable1 && biVariable2 ?
                                        <BiVariablePlot
                                            ref={bivarRef}
                                            panelStatus={leftPanelOpen + rightPanelOpen}
                                            biVariableDict={biVariableDict}
                                            biVariable1={biVariable1}
                                            biVariable2={biVariable2}
                                            updateVariable={updateVariable}
                                            updateBivariable={updateBivariable}
                                            entities={entities}
                                        />
                                        :
                                        <></>}
                                </Box>
                            </div>
                        </Box>

                        {/* Parallel Coordinates Plot */}
                        <Box className="component-container parallel-plot-container">
                            <Typography variant="h6" gutterBottom>Parallel Coordinates Plot</Typography>
                            <Box sx={{
                                boxSizing: 'border-box',
                                height: 'calc(100% - 32px)'
                            }}>
                                <ParallelSankeyPlot
                                    panelStatus={leftPanelOpen + rightPanelOpen}
                                    variablesDict={variablesDict}
                                    updateVariable={updateVariable}
                                    entities={entities}
                                    addEntities={addEntities}
                                    deleteEntities={deleteEntities}
                                    combineEntities={combineEntities}
                                    synchronizeSankeySelection={synchronizeSankeySelection}
                                />
                            </Box>
                        </Box>
                    </Box>

                    {/* Right Panel Toggle Button - shown when right panel is open */}
                    {rightPanelOpen && (
                        <IconButton
                            sx={{
                                position: 'absolute',
                                right: 'calc(25vw - 10px)', // Adjust based on your right panel width
                                top: '50%',
                                transform: 'translateY(-50%)',
                                backgroundColor: 'white',
                                '&:hover': { backgroundColor: '#f0f0f0' },
                                boxShadow: 2,
                                zIndex: 1000,
                                width: '24px',
                                height: '48px',
                                borderRadius: '4px 0 0 4px'
                            }}
                            onClick={() => setRightPanelOpen(false)}
                        >
                            <ChevronRightIcon />
                        </IconButton>
                    )}

                    {/* Right Panel Toggle Button - shown when right panel is closed */}
                    {!rightPanelOpen && (
                        <IconButton
                            sx={{
                                position: 'fixed',
                                right: '0',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                backgroundColor: 'white',
                                '&:hover': { backgroundColor: '#f0f0f0' },
                                boxShadow: 2,
                                zIndex: 1000,
                                width: '24px',
                                height: '48px',
                                borderRadius: '4px 0 0 4px'
                            }}
                            onClick={() => setRightPanelOpen(true)}
                        >
                            <ChevronLeftIcon />
                        </IconButton>
                    )}

                    {/* Right Panel */}
                    <Box
                        className="panel right-panel"
                        sx={{
                            display: rightPanelOpen ? 'block' : 'none',
                            position: 'relative'
                        }}
                    >
                        <div className="component-container results-container">
                            <Typography variant="h6" gutterBottom>Results Panel</Typography>
                            <Box sx={{
                                boxSizing: 'border-box',
                                height: 'calc(100% - 32px)'
                            }}>
                                <ResultsPanel
                                    entities={entities}
                                    variablesDict={variablesDict}
                                    parametersDict={parametersDict}
                                    currentVersion={currentVersion}
                                />
                            </Box>
                        </div>
                    </Box>
                </Box>
            )}
        </div>
    );
};
