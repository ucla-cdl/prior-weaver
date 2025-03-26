import React, { createContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

export const WorkspaceContext = createContext();

export const TASK_SETTINGS = {
    "house": {
        id: "house",
        name: "House Price Prediction",
        scenario: "You are a data scientist analyzing the factors that influence house prices.\
                Specifically, you aim to assess how a house's proximity to the nearest metro station, its age, and the number of nearby stores affect its selling price per square meter.",
        defaultModel: `model <- glm(house_unit_price ~ distance_to_metro + house_age + num_stores, family = gaussian(link = "identity"))`,
        variables: {
            "predictor": [
                {
                    "name": "distance_to_metro",
                    "unit": "km",
                    "description": "The distance from the house to the nearest metro station."
                },
                {
                    "name": "house_age",
                    "unit": "years",
                    "description": "The number of years since the house was built."
                },
                {
                    "name": "num_stores",
                    "unit": "stores",
                    "description": "The number of retail stores in the surrounding area."
                }
            ],
            "response": [
                {
                    "name": "house_unit_price",
                    "unit": "$k/m²",
                    "description": "The selling price of the house per square meter."
                }
            ]
        }
    },
    "income": {
        id: "income",
        name: "Income Prediction",
        scenario: "You are a social scientist studying the factors that influence income levels in the U.S.\
                Specifically, you want to evaluate how an individual's age and years of education impact their annual income.",
        defaultModel: `model <- glm(income ~ age + education, family = gaussian(link = "identity"))`,
        variables: {
            "predictor": [
                {
                    "name": "age",
                    "unit": "years",
                    "description": "The individual's age."
                },
                {
                    "name": "education",
                    "unit": "years",
                    "description": "The total number of years the individual has spent in formal education."
                }
            ],
            "response": [
                {
                    "name": "income",
                    "unit": "$k",
                    "description": "The individual's annual income in thousands of dollars."
                }
            ]
        }
    },
    "score": {
        id: "score",
        name: "Student Exam Score Prediction",
        scenario: "You are a data scientist investigating factors that influence student performance.\
                Specifically, you seek to understand how the number of hours a student studies and their attendance rate affect their exam score.",
        defaultModel: `model <- glm(exam_score ~ hours_study + attendance_rate, family = gaussian(link = "identity"))`,
        variables: {
            "predictor": [
                {
                    "name": "hours_study",
                    "unit": "hours",
                    "description": "The number of hours the student spends studying per week."
                },
                {
                    "name": "attendance_rate",
                    "unit": "%",
                    "description": "The percentage of classes the student attended."
                }
            ],
            "response": [
                {
                    "name": "exam_score",
                    "unit": "points",
                    "description": "The student's exam score."
                }
            ]
        }
    },
};

export const ELICITATION_SPACE = {
    OBSERVABLE: "observable",
    PARAMETER: "parameter"
}

export const FEEDBACK_MODE = {
    FEEDBACK: "feedback",
    NO_FEEDBACK: "no_feedback"
}

const steps = [
    {
        target: '.left-panel',
        content: `Show the task scenario, model, variables, and parameters.`,
        placement: 'right',
        data: {
            hide: []
        }
    },
    {
        target: '.center-panel',
        content: 'Explore the multi-view interactive visualizations, which are interconnected.',
        placement: 'center',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.univariate-container',
        content: `View the histogram representation of variable distributions.`,
        placement: 'right',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.parameters-container',
        content: `View the histogram representation of parameter distributions.`,
        placement: 'center',
        data: {
            hide: [ELICITATION_SPACE.OBSERVABLE]
        }
    },
    {
        target: '.parameter-operation-container',
        content: "Fit your sketched histogram to a continuous distribution by clicking the 'Fit' button and selecting the desired distribution.",
        placement: 'right',
        data: {
            hide: [ELICITATION_SPACE.OBSERVABLE]
        }
    },
    {
        target: '.bivariate-container',
        content: 'View the bivariate scatterplot of the selected variables.',
        placement: 'right',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.parallel-plot-container',
        content: 'Explore the parallel coordinates plot representing all variables.',
        placement: 'right',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.filter-container',
        content: `Filter the displayed entities based on their data completeness.`,
        placement: 'bottom',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.complete-filter-button',
        content: `When the complete filter is selected, only entities with values on all axes are displayed.`,
        placement: 'bottom',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER],
            pause: true
        }
    },
    {
        target: '.incomplete-filter-button',
        content: `When the incomplete filter is selected, entities with values on some axes are displayed.`,
        placement: 'bottom',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.results-container',
        content: 'View the prior predictive results based on your current specification.',
        placement: 'left',
        data: {
            hide: [FEEDBACK_MODE.NO_FEEDBACK]
        }
    },
    {
        target: '.version-operation-container',
        content: 'Undo or redo previous actions.',
        placement: 'bottom',
        data: {
            hide: [ELICITATION_SPACE.PARAMETER]
        }
    },
    {
        target: '.finish-button',
        content: `When you're satisfied with your specification, click 'Finish' to complete the task.`,
        placement: 'bottom',
        data: {
            hide: []
        }
    }
];

export const WorkspaceProvider = ({ children }) => {
    const location = useLocation();
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelOpen, setRightPanelOpen] = useState(true);

    const [userName, setUserName] = useState("admin");
    const [taskId, setTaskId] = useState(null);
    const [model, setModel] = useState('');
    const [space, setSpace] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [finishParseModel, setFinishParseModel] = useState(false);

    const [loadRecord, setLoadRecord] = useState(false);

    const [tutorial, setTutorial] = useState(false);
    const [tutorialSteps, setTutorialSteps] = useState([]);
    const [runTutorial, setRunTutorial] = useState(true);
    const [savedEnvironment, setSavedEnvironment] = useState(null);

    const [studyActive, setStudyActive] = useState(true);

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const exampleParam = searchParams.get('example');
        const spaceParam = searchParams.get('space');

        if (exampleParam === "true") {
            console.log("Example Mode");
            setStudyActive(false);
            setTaskId("house");
            setModel(TASK_SETTINGS["house"].defaultModel);
            setSpace(spaceParam);
            setFeedback(FEEDBACK_MODE.FEEDBACK);
            fetchRecord(`${spaceParam}-example`);
        } else {
            console.log("Study Mode");
            setStudyActive(true);
            fetchStudySettings();
        }
    }, [location]);

    const fetchStudySettings = () => {
        axios.get(window.BACKEND_ADDRESS + '/study-settings')
            .then(response => {
                console.log("fetching study settings", response.data);
                setUserName(response.data.user_name);
                setTaskId(response.data.task_id);
                setModel(TASK_SETTINGS[response.data.task_id].defaultModel);
                setSpace(response.data.elicitation_space);
                setFeedback(response.data.feedback_mode);

                if (response.data?.load_record) {
                    const recordName = response.data?.record_name;
                    fetchRecord(recordName);
                }
            })
            .catch(error => {
                console.log("Error fetching study settings:", error);
            });
    };

    const fetchRecord = (recordName) => {
        axios.get(window.BACKEND_ADDRESS + "/getRecord?record_name=" + recordName)
            .then((res) => {
                const record = JSON.parse(res.data.record);
                console.log("Fetched record:", record);
                setSavedEnvironment(record);
            })
            .catch(error => {
                console.log("No saved environment found or error loading it:", error);
            });
    };

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
        userName,
        setUserName,
        taskId,
        setTaskId,
        model,
        setModel,
        space,
        setSpace,
        feedback,
        setFeedback,
        loadRecord,
        setLoadRecord,
        savedEnvironment,
        tutorial,
        setTutorial,
        runTutorial,
        setRunTutorial,
        tutorialSteps,
        studyActive,
        setStudyActive
    };

    return (
        <WorkspaceContext.Provider value={contextValue}>
            {children}
        </WorkspaceContext.Provider>
    );
}; 