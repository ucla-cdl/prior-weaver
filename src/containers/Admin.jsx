import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Admin.css';

const Admin = () => {
    const [workspaces, setWorkspaces] = useState([]);

    useEffect(() => {
        // Fetch workspaces from the server
        axios.get('/api/workspaces')
            .then(response => {
                setWorkspaces(response.data);
            })
            .catch(error => {
                console.error('There was an error fetching the workspaces!', error);
            });
    }, []);

    return (
        <div className="admin-container">
            <h1>Admin Page</h1>
            <div className="gallery">
                {workspaces.map(workspace => (
                    <div key={workspace.id} className="workspace-card">
                        <h2>{workspace.name}</h2>
                        <p>{workspace.description}</p>
                        <Link to={`/workspace/${workspace.id}`}>Go to Workspace</Link>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Admin;