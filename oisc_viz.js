// Visualization of the OISC machine.
//
// The visualization is based on the following diagram:
//
//     +----+----+----+----+----+----+----+----+
//     | s1 | v1 |    | s7 | v7 |    | sD | vD |
//     +----+----+----+----+----+----+----+----+
//     | s2 | v2 |    | s8 | v8 |    | sE | vE |
//     +----+----+----+----+----+----+----+----+
//     | s3 | v3 |    | s9 | v9 |    | sF | vF |
//     +----+----+----+----+----+----+----+----+
//     | s4 | v4 |    | sA | vA |    | .. | .. |
//     +----+----+----+----+----+----+----+----+
//     | s5 | v5 |    | sB | vB |    | .. | .. |
//     +----+----+----+----+----+----+----+----+
//     | s6 | v6 |    | sC | vC |    | .. | .. |
//     +----+----+----+----+----+----+----+----+
//
//   A popup window is displayed when the user clicks on a symbol.
//   The popup window displays the symbol name, the symbol value, and the
//   symbol address.

// Generates the HTML for the OISC machine visualization.
function generate_table_display(num_rows, num_cols) {
    const table = document.createElement("table");
    table.className = "oisc_table";
    table.appendChild(row);
    for (let i = 0; i < num_rows; i++) {
        const row = document.createElement("tr");
        row.className = "oisc_row";
        for (let j = 0; j < num_cols; j++) {
            let ix = i * num_cols + j;
            const cell = document.createElement("td");
            cell.className = "oisc_cell";
            cell.id = "oisc_cell_" + ix;
            cell.addEventListener("click", show_config_window);
            const cell_value = document.createElement("input");
            cell_value.className = "oisc_cell_value";
            cell_value.id = "oisc_cell_" + ix + "_value";
            cell_value.name = "oisc_cell_" + ix + "_value";
            cell_value.type = "text";
            cell_value.readOnly = true;
            const cell_label = document.createElement("label");
            cell_label.className = "oisc_cell_label";
            cell_label.id = "oisc_cell_label_" + ix;
            cell_label.innerHTML = "(" + ix + ")";
            cell_label.target = "oisc_cell_" + ix + "_value";
            cell.appendChild(cell_label);
            cell.appendChild(cell_value);
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    document.getElementById("oisc_display").innerHTML = table.outerHTML;
}

// Opens the configuration popup window for each cell (onclick).
// The popup window lets you edit the symbol name, the value, and the callbacks.
function show_config_window(e) {
    const cell_id = e.target.id;
    const cell_ix = parseInt(cell_id.substring(cell_id.lastIndexOf("_")));
    const cell_config = cell_ix in oisc_config ? oisc_config[cell_ix] : {};
    const config_window = document.getElementById("oisc_config_window");
    config_window.style.display = "block";
    config_window.style.left = e.clientX + "px";
    config_window.style.top = e.clientY + "px";
    document.getElementById("oisc_config_name").value = cell_config.name ? cell_config.name : "";
    document.getElementById("oisc_config_value").value = cell_config.value ? cell_config.value : "0";
    document.getElementById("oisc_config_onread").value = cell_config.onread ? cell_config.onread : "";
    document.getElementById("oisc_config_onwrite").value = cell_config.onwrite ? cell_config.onwrite : "";
}

// Saves the configuration for the cell to oisc_config.
function save_config_window() {
    const cell_ix = parseInt(document.getElementById("oisc_config_window").id.substring(document.getElementById("oisc_config_window").id.lastIndexOf("_")));
    const cell_config = {
        name: document.getElementById("oisc_config_name").value,
        value: document.getElementById("oisc_config_value").value,
        onread: document.getElementById("oisc_config_onread").value,
        onwrite: document.getElementById("oisc_config_onwrite").value
    };
    oisc_config[cell_ix] = cell_config;
    document.getElementById("oisc_config_window").style.display = "none";
}

// Closes the configuration popup window.
function close_config_window() {
    document.getElementById("config_window").style.display = "none";
}