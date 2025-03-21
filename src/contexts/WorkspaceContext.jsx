import React, { createContext, useEffect, useState } from 'react';
import axios from 'axios';

export const WorkspaceContext = createContext();

export const TASK_SETTINGS = {
    "house": {
        id: "house",
        name: "House Price Prediction",
        scenario: "You are a data scientist interested in understanding the factors that influence house prices.\
                Specifically, you want to assess how house's distance to the nearest metro station, its age, and the number of stores in the area impact its selling price.",
        defaultModel: `model <- glm(house_price ~ distance_to_metro + house_age + num_stores, family = gaussian(link = "identity"))`,
        variables: {
            "predictor": [
                {
                    "name": "distance_to_metro",
                    "unit": "km",
                    "description": "The distance to the nearest metro station."
                },
                {
                    "name": "house_age",
                    "unit": "yrs",
                    "description": "The age of the house."
                },
                {
                    "name": "num_stores",
                    "unit": "stores",
                    "description": "The number of stores in the neighborhood."
                }
            ],
            "response": [
                {
                    "name": "house_unit_price",
                    "unit": "$k/m^2",
                    "description": "The selling price of the house per square meter."
                }
            ]
        }
    },
    "income": {
        id: "income",
        name: "Income Prediction",
        scenario: "You are a social scientist interested in understanding the factors that influence people's income.\
                Specifically, you want to assess how people's age and their years of education impact their annualy income in the U.S.",
        defaultModel: `model <- glm(income ~ age + education, family = gaussian(link = "identity"))`,
        variables: {
            "predictor": [
                {
                    "name": "age",
                    "unit": "yrs",
                    "description": "The age of the person."
                },
                {
                    "name": "education",
                    "unit": "yrs",
                    "description": "The years of education of the person."
                }
            ],
            "response": [
                {
                    "name": "income",
                    "unit": "$k",
                    "description": "The annual income of the person."
                }
            ]
        }
    },
    "score": {
        id: "score",
        name: "Student Exam Score Prediction",
        scenario: "You are a data scientist interested in understanding the factors that influence students' performance.\
                Specifically, you want to assess how students' hours of study and attendence rate impact their exam score.",
        defaultModel: `model <- glm(exam_score ~ hours_study + attendence_rate, family = gaussian(link = "identity"))`,
        variables: {
            "predictor": [
                {
                    "name": "hours_study",
                    "unit": "hrs",
                    "description": "The hours of study of the student."
                },
                {
                    "name": "attendence_rate",
                    "unit": "%",
                    "description": "The attendence rate of the student."
                }
            ],
            "response": [
                {
                    "name": "exam_score",
                    "unit": "pts",
                    "description": "The exam score of the student."
                }
            ]
        }
    },
    "car": {
        id: "car",
        name: "Car Price Prediction",
        scenario: "You are a data scientist interested in understanding the factors that influence car prices.\
                Specifically, you want to assess how car's present price and mileage impact its selling price.",
        defaultModel: `model <- glm(selling_price ~ mileage + present_price, family = gaussian(link = "identity"))`,
        variables: {
            "predictor": [
                {
                    "name": "mileage",
                    "unit": "miles",
                    "description": "The mileage of the car."
                },
                {
                    "name": "present_price",
                    "unit": "$k",
                    "description": "The present price of the car."
                }
            ],
            "response": [
                {
                    "name": "selling_price",
                    "unit": "$k", "description": "The selling price of the car."
                }
            ]
        }
    }
}

export const ELICITATION_SPACE = {
    OBSERVABLE: "Observable Space",
    PARAMETER: "Parameter Space"
}

export const FEEDBACK_MODE = {
    FEEDBACK: "With Feedback",
    NO_FEEDBACK: "Without Feedback"
}

const steps = [
    {
        target: '.left-panel',
        content: `Describe the Task's Scenario, model, variables.\n 
        You can "click the brush icon" next to the variable to modify the parameter's range.`,
        placement: 'right',
        data: {
            hide: [ELICITATION_SPACE.OBSERVABLE]
        }
    },
    {
        target: '.left-panel',
        content: `Describe the Task's Scenario, model, variables.\n 
        You can "click the brush icon" next to the variable to modify the variable's range and click the add/remove icon next to the variableto add/remove it from the bivariate scatterplot.`,
        placement: 'right',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.center-panel',
        content: 'Show the multi-view interactive visualziations, which are interconnected with each other.',
        placement: 'center',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.univariate-container',
        content: `Show the histogram distribution of the variables.\n
         You can draw the distribution by clicking the grid in the histogram plot.`,
        placement: 'right',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.parameters-container',
        content: `Show the histogram distribution of the parameters.\n
         You can draw the distribution by clicking the grid in the histogram plot.`,
        placement: 'center',
        data: {
            hide: [ELICITATION_SPACE.OBSERVABLE]
        }
    },
    {
        target: '.parameter-operation-container',
        content: "You can fit your sketched histogram to continuous distributions by cliking the fit button and selecting the desired distribution.",
        placement: 'right',
        data: {
            hide: [ELICITATION_SPACE.OBSERVABLE]
        }
    },
    {
        target: '.bivariate-container',
        content: 'Show the bivariate scatterplot of the selected two variables.',
        placement: 'right',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.parallel-plot-container',
        content: 'Show the parallel coordinates of all variables.',
        placement: 'right',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.filter-container',
        content: 'Select the filter of current specified entities. The complete filter will show the entities that have values on all axes, while the incomplete filter will show the entities that only have values on some axes.',
        placement: 'bottom',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.complete-filter-button',
        content: 'When the complete filter selected, you can brush on axes to select regions and click generate button to generate entities within those regions.',
        placement: 'bottom',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER],
            pause: true
        }
    },
    {
        target: '.incomplete-filter-button',
        content: 'When the incomplete filter selected, you can click the select button to begin selection of two groups of entities that you want to link together.',
        placement: 'bottom',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.results-container',
        content: 'Show the prior predictive results of current specification.',
        placement: 'left',
        data: {
            hide: [FEEDBACK_MODE.NO_FEEDBACK]
        }
    },
    {
        target: '.version-operation-container',
        content: 'Undo or Redo the previous actions.',
        placement: 'bottom',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.finish-button',
        content: 'When you are satisfied with your specification, you can click the finish button to end the current task.',
        placement: 'bottom',
        data: {
            hide: []
        }
    }
]

export const WorkspaceProvider = ({ children }) => {
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);

    const [taskId, setTaskId] = useState(null);
    const [model, setModel] = useState('');
    const [space, setSpace] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [finishParseModel, setFinishParseModel] = useState(false);

    const [examplePlayground, setExamplePlayground] = useState(false);

    const [tutorial, setTutorial] = useState(false);
    const [tutorialSteps, setTutorialSteps] = useState([]);
    const [runTutorial, setRunTutorial] = useState(true);
    const [savedEnvironment, setSavedEnvironment] = useState(null);

    useEffect(() => {
        axios.get(window.BACKEND_ADDRESS + '/study-settings')
            .then(response => {
                console.log("fetching study settings", response.data);
                setTaskId(response.data.task_id);
                setModel(TASK_SETTINGS[response.data.task_id].defaultModel);
                setSpace(response.data.elicitation_space);
                setFeedback(response.data.feedback_mode);

                if (response.data.example_playground) {
                    const dataURL = `/example-data-${response.data.elicitation_space === ELICITATION_SPACE.PARAMETER ? "parameter" : "observable"}.json`;
                    fetch(dataURL, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    })
                        .then((res) => {
                            console.log("fetching example data", res);
                            return res.json()
                        })
                        .then((data) => {
                            console.log("Loaded saved environment:", data);
                            setSavedEnvironment(data);
                        })
                        .catch(error => {
                            console.log("No saved environment found or error loading it:", error);
                        });
                }
            })
            .catch(error => {
                console.log("Error fetching study settings:", error);
            });
    }, []);

    useEffect(() => {
        if (tutorial) {
            const displaySteps = steps.filter(step => !step.data.hide.includes(space) && !step.data.hide.includes(feedback));
            setTutorialSteps(displaySteps);
            setRunTutorial(true);
        }
    }, [space, feedback, tutorial]);

    const contextValue = {
        finishParseModel,
        setFinishParseModel,
        leftPanelOpen,
        setLeftPanelOpen,
        rightPanelOpen,
        setRightPanelOpen,
        taskId,
        setTaskId,
        model,
        setModel,
        space,
        setSpace,
        feedback,
        setFeedback,
        examplePlayground,
        setExamplePlayground,
        savedEnvironment,
        tutorial,
        setTutorial,
        runTutorial,
        setRunTutorial,
        tutorialSteps
    };

    return (
        <WorkspaceContext.Provider value={contextValue}>
            {children}
        </WorkspaceContext.Provider>
    );
}; 