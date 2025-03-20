import React, { createContext, useState, useRef, useEffect, useContext } from 'react';
import { TASK_SETTINGS, WorkspaceContext } from './WorkspaceContext';
import axios from 'axios';

export const VariableContext = createContext();

const DEFAULT_VARIABLE_ATTRIBUTES = {
    min: 0,
    max: 100,
};

const DEFAULT_PARAMETER_ATTRIBUTES = {
    min: 0,
    max: 10,
    roulettePoints: [],
    distributions: [],
    selectedDistributionIdx: null,
};

export const VariableProvider = ({ children }) => {
    const { taskId, model, setModel, finishParseModel, setFinishParseModel } = useContext(WorkspaceContext);
    const [variablesDict, setVariablesDict] = useState({});
    const [sortableVariables, setSortableVariables] = useState([]);
    const [parametersDict, setParametersDict] = useState({});
    const [biVariable1, setBiVariable1] = useState(null);
    const [biVariable2, setBiVariable2] = useState(null);
    const [translated, setTranslated] = useState(0);

    useEffect(() => {
        setSortableVariables(Object.values(variablesDict).sort((a, b) => a.sequenceNum - b.sequenceNum));
    }, [variablesDict]);

    useEffect(() => {
        if (finishParseModel) {
            setBiVariable1(Object.values(variablesDict)[1]);
            setBiVariable2(Object.values(variablesDict)[0]);
        }
    }, [finishParseModel]);

    // Add a new variable
    const addVariable = (data) => {
        updateVariable(data.name, data);

        const paramName = `p_${data.name}`;
        updateParameter(paramName, {
            name: paramName,
            relatedVar: data.name,
            ...DEFAULT_PARAMETER_ATTRIBUTES
        });
    };

    // Update the variable
    const updateVariable = (name, updates) => {
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

        console.log("update variable", name, finalUpdates);
        setVariablesDict(prev => ({
            ...prev,
            [name]: { ...prev[name], ...finalUpdates }
        }));
    }

    // Update the parameter
    const updateParameter = (name, updates) => {
        let finalUpdates = { ...updates };

        // If min or max is updated, recalculate bin edges
        if ('min' in updates || 'max' in updates) {
            const currentParameter = parametersDict[name] || {};
            const newMin = updates.min ?? currentParameter.min;
            const newMax = updates.max ?? currentParameter.max;

            // Create 10 equally spaced bins
            const binCount = 10;
            const step = (newMax - newMin) / binCount;
            const binEdges = Array.from({ length: binCount + 1 }, (_, i) => newMin + step * i);

            finalUpdates.binEdges = binEdges;
        }

        console.log("update parameter", name, finalUpdates);
        setParametersDict(prev => ({
            ...prev,
            [name]: { ...prev[name], ...finalUpdates }
        }));
    }

    const parseVariables = () => {
        const variables = TASK_SETTINGS[taskId].variables;
        let index = 0;
        Object.entries(variables).forEach(([type, vars]) => {
            if (type === "response") {
                updateVariable(vars[0].name, {
                    name: vars[0].name,
                    type: type,
                    unitLabel: vars[0].unit,
                    sequenceNum: index,
                    ...DEFAULT_VARIABLE_ATTRIBUTES
                });
                index++;
            }
            else if (type === "predictor") {
                vars.forEach((v) => {
                    addVariable({
                        name: v.name,
                        type: type,
                        unitLabel: v.unit,
                        sequenceNum: index,
                        ...DEFAULT_VARIABLE_ATTRIBUTES
                    });
                    index++;
                });
            }
        });

        // Add Extra parameters
        updateParameter('intercept', {
            name: 'intercept',
            relatedVar: 'intercept',
            ...DEFAULT_PARAMETER_ATTRIBUTES
        });

        setFinishParseModel(true);
    }

    // Parse the model in R code
    const handleParseModel = () => {
        axios.post(window.BACKEND_ADDRESS + '/getStanCodeInfo', {
            code: model
        })
            .then((response) => {
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
                                unitLabel: "",
                                sequenceNum: 0,
                                ...DEFAULT_VARIABLE_ATTRIBUTES
                            });
                            break;
                        case "predictors":
                            sectionInfo.forEach((predictor, index) => {
                                addVariable({
                                    name: predictor,
                                    type: "predictor",
                                    unitLabel: "",
                                    sequenceNum: index + 1,
                                    ...DEFAULT_VARIABLE_ATTRIBUTES
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
                updateParameter('intercept', {
                    name: 'intercept',
                    relatedVar: 'intercept',
                    ...DEFAULT_PARAMETER_ATTRIBUTES
                });
            })
            .finally(() => {
                setFinishParseModel(true);
            })
            .catch((error) => {
                console.log(error);
            });
    }

    // Add variable to the bi-variable plot
    const addToBiVarPlot = (variable) => {
        if (biVariable1 === null) {
            setBiVariable1(variable);
        }
        else if (biVariable2 === null) {
            setBiVariable2(variable);
        }
    }

    const contextValue = {
        variablesDict,
        setVariablesDict,
        parametersDict,
        setParametersDict,
        updateParameter,
        biVariable1,
        setBiVariable1,
        biVariable2,
        setBiVariable2,
        addVariable,
        updateVariable,
        handleParseModel,
        parseVariables,
        DEFAULT_VARIABLE_ATTRIBUTES,
        addToBiVarPlot,
        sortableVariables,
        setSortableVariables,
        translated,
        setTranslated,
    };

    return (
        <VariableContext.Provider value={contextValue}>
            {children}
        </VariableContext.Provider>
    );
}; 