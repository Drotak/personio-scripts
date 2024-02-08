// ==UserScript==
// @name         Personio
// @namespace    http://tampermonkey.net/
// @version      2024-02-08_1
// @description  Always select the default department
// @author       Michael Klotzner
// @match        https://*.personio.de/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://code.jquery.com/jquery-3.7.1.slim.min.js
// @require      https://cdn.jsdelivr.net/npm/js-cookie@3.0.5/dist/js.cookie.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let departments = [];
    let selected_default_department_id = null;
    let selected_departments = [];

    getDepartments().then((ret) => {
        departments = ret;
    });

    let observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (!mutation.addedNodes) return

            for (let i = 0; i < mutation.addedNodes.length; i++) {
                let node = mutation.addedNodes[i]
                // add select
                if(node["nodeName"] === "MAIN" || (node["nodeName"] === "DIV" && node["className"].includes("EmployeeHeader-module__container")))
                {
                    // reduce list of shown departments
                    let reduce_list_select = `<select id="department_select" multiple style="margin-bottom: 12px;">`;
                    selected_departments = Cookies.get("cookie_departments") ?? [];
                    for(let j = 0; j < departments.length; j++)
                    {
                        reduce_list_select += `<option value="${departments[j].id}" ${selected_departments.includes(departments[j].id) ? "selected" : ""}>${departments[j].attributes.name}</option>`
                    }
                    reduce_list_select += `</select>`;

                    // select default department (will be filled with updateDefaultSelect function)
                    let select_default = `<select id="default_department_select">`;
                    select_default += `</select>`;

                    // add elements to DOM
                    $(node).find('[class*="EmployeeInfo-module__container"]').append(`<div style='display: flex; flex-direction: column; justify-content: center; padding-left: 18px;'>
                      <h2>Select your departments</h2>
                      <p style="font-size: 10px">First: Update your departments (choose what you need)</p>
                      ${reduce_list_select}
                      <p style="font-size: 10px">Second: Choose your default department</p>
                      ${select_default}
                    </div>`);

                    updateDefaultSelect();

                    // if list of shown department changes
                    $("#department_select").on("change", () => {
                        selected_departments = [];
                        $( "#department_select option:selected" ).each( function() {
                            selected_departments.push($( this ).val());
                        } );
                        Cookies.set("cookie_departments", selected_departments, { SameSite: "Strict" });

                        selected_default_department_id = Cookies.get("cookie_default_department");
                        // if you deselect the default, set the default to null
                        if(!selected_departments.includes(selected_default_department_id))
                        {
                            $("#default_department_select option[value='null']").prop("selected", true);
                            Cookies.remove("cookie_default_department");
                        }

                        // if only one is selected, the default can't be anotherone
                        if(selected_departments.length === 1){
                            // only change if something is selected
                            if(selected_default_department_id && !selected_departments.includes(selected_default_department_id)) {
                                $("#default_department_select option[value='null']").prop("selected", true);
                                Cookies.remove("cookie_default_department");
                            }
                        }

                        // if none is selected, there can't be a default
                        if(selected_departments.length === 0) {
                            $("#default_department_select option[value='null']").prop("selected", true);
                            Cookies.remove("cookie_default_department");
                        }

                        updateDefaultSelect();
                    });

                    // if default department changes
                    $("#default_department_select").on("change", () => {
                        selected_default_department_id = null;
                        $( "#default_department_select option:selected" ).each( function() {
                            selected_default_department_id = $( this ).val();
                        } );
                        selected_departments = [];
                        selected_departments = Cookies.get("cookie_departments").split(",") ?? [];
                        if(!selected_departments.includes(selected_default_department_id)){
                            selected_departments.push(selected_default_department_id);
                            Cookies.set("cookie_departments", selected_departments, { SameSite: "Strict" });
                            $(`#department_select option[value="${selected_default_department_id}"]`).prop('selected', true)
                        }
                        Cookies.set("cookie_default_department", selected_default_department_id, { SameSite: "Strict" });
                    });
                }

                // remove all not selected departments from the list
                if(node["nodeName"] === "DIV" && node.dataset["testId"] === "day-entry-field-projects-list")
                {
                    selected_departments = Cookies.get("cookie_departments") ?? [];
                    if(selected_departments.length)
                    {
                        $(node).children('ul').children('li').each(function () {
                            let node_dep = departments.filter(obj => {
                                return obj.attributes.name === this.title
                            })[0];
                            if(!selected_departments.includes(node_dep.id))
                            {
                                $(this).remove();
                            }
                        });
                    }
                }

                // select default department
                if(node["nodeName"] === "SECTION" && node.dataset["testId"] === "work-entry")
                {
                    selected_default_department_id = Cookies.get("cookie_default_department") ?? null;
                    if(selected_default_department_id)
                    {
                        let default_department = departments.filter(obj => { return obj.id == selected_default_department_id })[0];
                        let b2 = $(node).find(`div[data-test-id="day-entry-field-projects"]`).find("button")[0];
                        if(b2)
                        {
                            b2.click();
                        }
                        let l1 = $(node).find(`li[title*="${default_department.attributes.name}"]`)[0];
                        if(l1)
                        {
                            l1.click();
                        }
                    }
                }
            }
        })
    });

    observer.observe(document.body, {
        childList: true
        , subtree: true
        , attributes: false
        , characterData: false
    });

    function updateDefaultSelect() {
        let select_default = "";
        selected_default_department_id = Cookies.get("cookie_default_department") ?? [];
        select_default += `<option value=null ${selected_default_department_id == null ? "selected" : ""}></option>`;
        selected_departments = Cookies.get("cookie_departments") ?? [];
        let selected_department_objects = departments.filter(obj => {
            return selected_departments.includes(obj.id)
        });
        for(let j = 0; j < selected_department_objects.length; j++)
        {
            select_default += `<option value="${selected_department_objects[j].id}" ${selected_default_department_id == selected_department_objects[j].id ? "selected" : ""}>${selected_department_objects[j].attributes.name}</option>`;
        }

        $("#default_department_select").empty();
        $("#default_department_select").append(select_default);
    };

    // get all departments
    async function getDepartments() {
        let return_value = await fetch(`${window.location.origin}/api/v1/projects?filter[active]=1`, {
            "credentials": "include",
            "headers": {
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.5",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin"
            },
            "referrer": "https://easelink-gmbh.personio.de/attendance/employee/2709390",
            "method": "GET",
            "mode": "cors"
        });

        return (await return_value.json()).data;
    }
})();
