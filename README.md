# Bi-Level Prior Elicitation

Prior specification, where an analyst incorporates knowledge from outside the dataset as a univariate distribution, is essential to Bayesian analysis. However, precisely specifying such knowledge can be labor-intensive, even for experienced statisticians, let alone novices.

In order to lower the barrier of this process, we develop an interactive prior elicitation system. Our system provides (i) a three-stage scaffold for prior specification, (ii) a flexbile and iterative specification process, (iii) direct manipulation for intuitive specification, and (iv) a mapping of user intentions to specifications (WIP).

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
<!-- - [Contributing](#contributing)
- [License](#license) -->

## Features

### Three-stage Scaffold
Users are offered three modules that correspond to three levels of abstraction in the prior elicitation process (i.e., conceptual model, bivariate relationship, and univariate distribution).

[Figure: conceptual model -> bivariate -> marginal]

### Flexible and Iterative Specification
Users are able to freely navigate between different stages of the specification process, making adjustments and assumptions in a non-linear manner. 

### Direct Manipulation
Users can modify distrbutions by simple interactions, such as draging and clicking.

### Mapping of User Intentions to Specifications
[WIP]

## Technologies Used

- [React](https://reactjs.org/)
- [D3.js](https://www.d3js.org)
- [Fitter](https://fitter.readthedocs.io/en/latest/index.html)

## Installation

The node and npm version used in the developent are as follows:
```bash
node = v21.2.0
npm = 10.8.3
```

To get a local copy up and running, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/realxavierx/Prior-Elicitation.git
   ```

2. Navigate into the project directory:
   ```bash
   cd Prior-Elicitation
   ```

3. Install the dependencies:
   ```bash
   npm install
   ```

4. Start the  server:
   ```bash
   npm start
   ```

   The web interface will be running at `http://localhost:3000` and the backend will be running at `http://localhost:8000`.

## Usage

### Adding a Variable
Click `Add Variable` to add a new variable in your analysis by specifying the `name` and `range` of this variable.

### Adding a Causal Relationship
Click `Add Relation` to add a new causal relation between two variables.

### Specifying a Bivariate Relationship
After choosing two variables using the selector, a bivariate plot would be automatically generated. There are three modes you could select:

- Predict: Add a anchor point that draws up a trend line.
- Populate: Add a data point. 
- Chip: Add a data point by allocating two available "chips" from the marginal plot.

### Specifying a Univariate Relationship
Drag and drop the toggle point on each bin to adjust the histogram.

### Choose an Appropriate Distribution
Click `Fit Distribution` to automatically fit the discrete histogram data to possible distributions. The available distrbutions will be shown on the panel right next to the univariate plot, click `Show` to inspect the distribution and click `Select` to pick.   

<!-- ## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/AmazingFeature`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
5. Push to the branch (`git push origin feature/AmazingFeature`).
6. Open a Pull Request.

## License

Distributed under the MIT License. See `LICENSE` for more information. -->

---
