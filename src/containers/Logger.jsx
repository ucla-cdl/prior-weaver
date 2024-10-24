import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';

export default function Logger(params) {

    const logColumns = ['Timestamp', 'Component', 'Action', 'Function', 'Details'];

    return (
        <Paper>
            <Table>
                <TableHead>
                    <TableRow>
                        {logColumns.map((col, idx) => (
                            <TableCell key={idx}>
                                {col}
                            </TableCell>
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {JSON.parse(localStorage.getItem('userLogs')).map((logRow, idx) => (
                        <TableRow key={idx}>
                            {Object.entries(logRow).map(([key, val], index) => (
                                <TableCell key={index}>
                                    {val}
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Paper>
    )
}