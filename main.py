from fastapi import FastAPI, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from concurrent.futures.process import ProcessPoolExecutor
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from enum import Enum

import numpy as np
import re
import scipy.stats as stats
from fitter import Fitter, get_distributions, get_common_distributions

import pandas as pd
from sklearn.preprocessing import PolynomialFeatures
from sklearn.linear_model import LinearRegression

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_db_client():
    print("Backend is ready")


@app.on_event("shutdown")
def shutdown_db_client():
    print("Backend is shut down")


@app.get('/')
def root():
    print("checking root")
    return {"message": "Hello World!"}


# ================================ ADMIN ENDPOINTS =================================
class ElicitationSpace(str, Enum):
    PARAMETER = "Parameter Space"
    OBSERVABLE = "Observable Space"


class FeedbackMode(str, Enum):
    FEEDBACK = "With Feedback"
    NO_FEEDBACK = "Without Feedback"


class TaskIDs(str, Enum):
    GROWTH = "growth"
    INCOME = "income"
    LOAN = "loan"
    INSURANCE = "insurance"
    PRESSURE = "pressure"


# Store current study settings
current_study_settings = {
    "task_id": TaskIDs.INCOME,
    "elicitation_space": ElicitationSpace.OBSERVABLE,
    "feedback_mode": FeedbackMode.FEEDBACK
}


class AdminUpdateSettings(BaseModel):
    task_id: Optional[str]
    elicitation_space: Optional[ElicitationSpace]
    feedback_mode: Optional[FeedbackMode]


@app.get('/study-settings')
def get_study_settings():
    return current_study_settings


@app.post('/admin/study-settings')
def update_study_settings(settings: AdminUpdateSettings):
    # Simple API key validation - you should implement proper authentication

    if settings.task_id is not None:
        current_study_settings["task_id"] = settings.task_id

    if settings.elicitation_space is not None:
        current_study_settings["elicitation_space"] = settings.elicitation_space

    if settings.feedback_mode is not None:
        current_study_settings["feedback_mode"] = settings.feedback_mode

    return current_study_settings


# ================================ USER ENDPOINTS =================================
class StanCodeRequest(BaseModel):
    code: str


@app.post('/getStanCodeInfo')
def parse_stan_code(request: StanCodeRequest):
    parsed_res = parse_glm_code(request.code)
    return {
        "code_info": parsed_res
    }


def parse_glm_code(code):
    # Define the pattern to match the glm formula and components
    formula_pattern = r"glm\s*\((.*?)\,\s*"
    family_pattern = r"family\s*=\s*([a-zA-Z]+)"
    link_pattern = r"link\s*=\s*\"?([a-zA-Z]+)\"?"

    # Extract the glm formula (inside the glm() function)
    formula_match = re.search(formula_pattern, code)
    if not formula_match:
        raise ValueError("No glm formula found in the code.")

    formula = formula_match.group(1).strip()

    # Parse the response and predictors from the formula
    formula_parts = formula.split("~")
    if len(formula_parts) != 2:
        raise ValueError("Invalid glm formula structure.")

    response = formula_parts[0].strip()
    predictors = formula_parts[1].strip()
    predictors = [pred.strip() for pred in predictors.split("+")]

    # Extract family and link function using the patterns
    family_match = re.search(family_pattern, code)
    link_match = re.search(link_pattern, code)

    family = family_match.group(1) if family_match else None
    link = link_match.group(1) if link_match else None

    return {
        "code": code,
        "formula": formula,
        "response": response,
        "predictors": predictors,
        "family": family,
        "link": link
    }


def parse_stan_code(code):
    block_patterns = {
        "data": r"data\s*{([^}]*)}",
        "parameters": r"parameters\s*{([^}]*)}",
        "model": r"model\s*{([^}]*)}",
    }

    def parse_block(block):
        """Parse a block and return detailed information for each variable."""
        if not block:
            return []
        lines = block.strip().split("\n")
        variables = []

        for line in lines:
            line = line.strip().replace(";", "")  # Remove semicolons
            parts = re.split(r"\s+", line)
            if len(parts) >= 2:
                var_type = parts[0]  # First part is the type (e.g., real, int)
                var_name = parts[-1]  # Last part is the variable name

                variables.append({
                    "name": var_name,
                    "full_declaration": line
                })

        return variables

    # Extract and parse each block
    result = {}
    for block_name, pattern in block_patterns.items():
        match = re.search(pattern, code, re.DOTALL)
        result[block_name] = parse_block(match.group(1)) if match else []

    return result


class TranslationData(BaseModel):
    entities: List[dict]
    variables: List[dict]
    parameters: List[dict]


@app.post('/translate')
def translate(data: TranslationData = Body(...)):
    print("translation started")
    entities = data.entities
    variables = data.variables
    parameters = data.parameters

    predictors = [var for var in variables if var["type"] == "predictor"]
    response = [var for var in variables if var["type"] == "response"][0]
    parameters_dict = {param['relatedVar']: param['name']
                       for param in parameters}

    # Bootstrapping to fit linear model and get parameter samples
    parameter_samples = bootstrap_fit_linear_model(
        entities, predictors, response, parameters_dict)

    # Convert parameter samples to distributions
    priors_results = {}
    for param_name, samples in parameter_samples.items():
        fitted_dists, param_min, param_max = fit_samples_to_distributions(
            samples)

        priors_results[param_name] = fitted_dists

    return {
        "priors_results": priors_results
    }


class PredictiveCheckData(BaseModel):
    variables: List[dict]
    priors: List[dict]


@app.post('/check')
def update_check_results(data: PredictiveCheckData = Body(...)):
    variables = data.variables
    priors = data.priors

    predictors = [var for var in variables if var["type"] == "predictor"]
    response = [var for var in variables if var["type"] == "response"][0]

    prior_distributions = [prior for prior in priors]
    check_results = prior_predictive_check(
        predictors, response, prior_distributions)

    return {
        "check_results": check_results
    }


def bootstrap_fit_linear_model(entities, predictors, response, parameters_dict):
    sorted_variables = predictors + [response]

    dataset = np.array([
        [entity[var['name']] for var in sorted_variables]
        for entity in entities
    ])
    X = dataset[:, :-1]
    y = dataset[:, -1]

    num_samples = 100
    n_records = 50
    parameter_samples = {param_name: []
                         # Store coefficients
                         for param_name in parameters_dict.values()}

    for _ in range(num_samples):
        # Bootstrap sampling
        # Sample n_records from the dataset with replacement
        indices = np.random.choice(len(entities), n_records, replace=True)
        X_sample = X[indices]
        y_sample = y[indices]

        # Fit linear model
        model = LinearRegression()
        model.fit(X_sample, y_sample)

        # Store parameter estimates
        for i, var in enumerate(predictors):
            parameter_samples[parameters_dict[var['name']]].append(model.coef_[
                                                                   i])
        parameter_samples["intercept"].append(model.intercept_)

    return parameter_samples


def fit_samples_to_distributions(samples):
    fit_dists = []

    # unifrom, normal, student-t, gamma, beta, skew-normal, log-normal, log-student-t, mirror gamma, mirror log-normal, mirror log student-t
    distributions = ['uniform', 'norm', 't', 'gamma',
                     'beta', 'skewnorm', 'lognorm', 'loggamma', 'expon']
    f = Fitter(samples, distributions=distributions)
    f.fit()

    # Generate x values for plotting the PDF of the fitted distributions
    min_sample = min(samples)
    max_sample = max(samples)

    # Extend min/max range for smooth kde
    padding_ratio = 0.15
    padding = (max_sample - min_sample) * padding_ratio
    x_min = min_sample - padding
    x_max = max_sample + padding

    x = np.linspace(x_min, x_max, 1000)

    sum = f.summary(Nbest=len(distributions), plot=False)

    for dist in sum.iloc:
        fit_name = dist.name
        fit_params = f.fitted_param[fit_name]
        fit_distribution = getattr(stats, fit_name)
        param_names = (fit_distribution.shapes + ", loc, scale").split(
            ", ") if fit_distribution.shapes else ["loc", "scale"]

        fit_params_dict = {}
        for d_key, d_val in zip(param_names, fit_params):
            if not np.isnan(d_val) and not np.isinf(d_val):
                fit_params_dict[d_key] = float(f"{d_val:.2f}")
            else:
                print("invalid param: ", d_key, " = ", d_val)

        p = get_fit_var_pdf(x, fit_name, fit_params_dict)

        metrics = {}
        sum_row = sum.loc[fit_name]
        for col_label in sum.columns:
            if not np.isnan(sum_row[col_label]) and not np.isinf(sum_row[col_label]):
                metrics[col_label] = float(f"{sum_row[col_label]:.2f}")

        if np.isnan(p).any() or np.isinf(p).any() or np.isnan(x).any() or np.isinf(x).any():
            print("invalid distribution: ", fit_name)
            continue

        fit_dists.append({
            'name': fit_name,
            'params': fit_params_dict,
            'x': x.tolist(),
            'p': p.tolist(),
            'metrics': metrics
        })

        print("distribution fitted: ", fit_name)

    return fit_dists, x_min, x_max


def get_fit_var_pdf(x, fit_name, fit_params):
    # Get the distribution function from scipy.stats based on fit_name
    dist = getattr(stats, fit_name)

    # Pass the keyword arguments dynamically based on the provided fit_params
    p = dist.pdf(x, **fit_params)

    return p


def prior_predictive_check(predictors, response, prior_distributions, num_checks=10, num_samples=100):
    # ideal data structure for the simulated dataset
    # [{params: {a: val1, b: val2, c: val3}, dataset: [{age: val1, edu: val2, income: val3}]} ]
    simulated_results = []

    # sample n sets of parameters values
    # parameter_samples = [
    # [param1_val1, param1_val2, param1_val3, ...],
    # [param2_val1, param2_val2, param2_val3, ...],
    # ...]
    parameter_samples = []
    for dist in prior_distributions:
        samples = getattr(stats, dist['name']).rvs(
            **dist["params"], size=num_checks)
        parameter_samples.append(samples)

    # sample m sets of predictor values for each set of parameter values
    # predictor_samples = [
        # [[age_val1, age_val2, age_val3, ...], [edu_val1, edu_val2, edu_val3, ...]],
        # [[age_val1, age_val2, age_val3, ...], [edu_val1, edu_val2, edu_val3, ...]],
        # ...]
    predictor_samples = [[] for _ in range(num_checks)]
    for check_index in range(num_checks):
        for predictor in predictors:
            predictor_sample = np.random.uniform(
                predictor['min'], predictor['max'], size=num_samples)
            predictor_samples[check_index].append(predictor_sample)

    # simulate the outcomes using each set of parameter values and the corresponding sets of predictor values
    simulated_results = []
    min_simulated_response_val = response['min']
    max_simulated_response_val = response['max']

    for check_index in range(num_checks):
        simu_results = {}
        simu_results['params'] = [para_samples[check_index]
                                  for para_samples in parameter_samples]
        simu_results['dataset'] = []

        response_values = []  # Store simulated response values for KDE fitting

        for sample_index in range(num_samples):
            simu_data = {}
            simu_response_val = 0
            for predictor_index, predictor in enumerate(predictors):
                simu_data[predictor['name']
                          ] = predictor_samples[check_index][predictor_index][sample_index]
                simu_response_val += simu_results['params'][predictor_index] * \
                    predictor_samples[check_index][predictor_index][sample_index]

            simu_response_val += simu_results['params'][-1]  # Add intercept
            simu_data[response['name']] = simu_response_val
            simu_results['dataset'].append(simu_data)

            response_values.append(simu_response_val)

        min_simulated_response_val = min(
            min_simulated_response_val, min(response_values))
        max_simulated_response_val = max(
            max_simulated_response_val, max(response_values))

        simulated_results.append(simu_results)

    # Extend min/max range for smooth kde
    padding_ratio = 0.15
    padding = (max_simulated_response_val -
               min_simulated_response_val) * padding_ratio
    x_min = min_simulated_response_val - padding
    x_max = max_simulated_response_val + padding

    max_density_val = 0
    for check_index in range(num_checks):
        simu_results = simulated_results[check_index]
        response_values = [simu_data[response['name']]
                           for simu_data in simu_results['dataset']]

        # Fit KDE to the simulated response values
        kde = stats.gaussian_kde(response_values)
        x_values = np.linspace(x_min, x_max, 100)
        density_values = kde(x_values)

        max_density_val = max(max_density_val, max(density_values))

        # Store KDE results for visualization
        simu_results['kde'] = [
            {'x': x_values[i], 'density': density_values[i]} for i in range(len(x_values))]

    results = {
        'min_response_val': x_min,
        'max_response_val': x_max,
        'max_density_val': max_density_val,
        'simulated_results': simulated_results
    }

    return results


def get_r_code_from_dist(dist_name, params):
    if dist_name == "norm":
        return f"dnorm(x, mean={params['loc']}, sd={params['scale']})"
    elif dist_name == "expon":
        rate = 1 / params["scale"]
        return f"dexp(x, rate={rate})"
    elif dist_name == "lognorm":
        import numpy as np
        scale = params["scale"]
        meanlog = np.log(scale)
        return f"dlnorm(x, meanlog={meanlog}, sdlog={params['s']})"
    elif dist_name == "gamma":
        rate = 1 / params["scale"]
        return f"dgamma(x, shape={params['a']}, rate={rate})"
    elif dist_name == "beta":
        return f"dbeta(x, shape1={params['a']}, shape2={params['b']})"
    elif dist_name == "uniform":
        max_val = params["loc"] + params["scale"]
        return f"dunif(x, min={params['loc']}, max={max_val})"
    else:
        return "Distribution not supported"


class FitDistributionData(BaseModel):
    samples: List[float]


@app.post('/fitDistribution')
def fitDistribution(data: FitDistributionData = Body(...)):
    samples = np.array(data.samples)

    # Fit distributions to the samples
    fitted_distributions, x_min, x_max = fit_samples_to_distributions(samples)

    # Return the best fitting distribution (first in the list)
    if fitted_distributions:
        return {
            'distributions': fitted_distributions
        }
    else:
        return {
            'error': 'Could not fit any distribution to the provided data'
        }
