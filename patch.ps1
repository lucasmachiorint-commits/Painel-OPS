$file = "C:\Users\331262\.gemini\antigravity\scratch\capacity-fte-calculator-v2\app.js"
$content = Get-Content -Path $file -Raw

$startToken = "function renderCadastrosView() {"
$endToken = "// Update bulk delete button state helper"

$startIdx = $content.IndexOf($startToken)
$endIdx = $content.IndexOf($endToken, $startIdx)

if ($startIdx -lt 0 -or $endIdx -lt 0) {
    Write-Host "Boundaries not found!"
    exit 1
}

$before = $content.Substring(0, $startIdx)
$after = $content.Substring($endIdx)

$newFunction = @"
function renderCadastrosView() {
    const teamsList = document.getElementById('cadastros-teams-list');
    const responsiblesList = document.getElementById('cadastros-responsibles-list');
    const tableBody = document.getElementById('cadastros-table-body');
    const activityCountBadge = document.getElementById('cadastros-activity-count');
    
    if (!teamsList || !responsiblesList || !tableBody || !activityCountBadge) return;
    
    // Populate new responsible team select options
    const newRespTeamSelect = document.getElementById('select-new-responsible-team');
    if (newRespTeamSelect) {
        newRespTeamSelect.innerHTML = (state.teams || []).map(team => `
            <option value="`${escapeHtml(team)}`">`${escapeHtml(team)}`</option>
        `).join('');
    }

    // 1. Render Teams List
    if (!state.teams || state.teams.length === 0) {
        if(teamsList) teamsList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem;">Nenhuma equipe cadastrada.</div>';
    } else {
        if(teamsList) {
            teamsList.innerHTML = state.teams.map(team => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.01);">
                    <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-primary);">`${escapeHtml(team)}`</span>
                    <button class="btn-delete-team-item" data-permissao="ADMIN" data-team="`${escapeHtml(team)}`" style="background: transparent; border: none; color: var(--color-danger); cursor: pointer; font-size: 0.8rem; padding: 0.2rem;" title="Excluir Equipe">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `).join('');
            
            teamsList.querySelectorAll('.btn-delete-team-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessário.'); return; }
                    const team = btn.getAttribute('data-team');
                    if (confirm(`Deseja realmente excluir a equipe "`${team}`"? Todos os responsáveis e atividades desta equipe ficarão "Sem Equipe".`)) {
                        state.teams = state.teams.filter(t => t !== team);
                        state.processes.forEach(p => {
                            if (p.area === team) p.area = '';
                        });
                        if (state.responsaveis) {
                            state.responsaveis.forEach(r => {
                                if (r.area === team) r.area = '';
                            });
                        }
                        if (state.teamHierarchy) {
                            delete state.teamHierarchy[team];
                        }
                        saveState();
                        renderCadastrosView();
                        renderAreaFilterOptions();
                        renderTable();
                        renderBalancingTable();
                        renderReviewTable();
                    }
                });
            });
        }
    }

    // Helper to toggle accordion
    const toggleAccordion = (headerDiv, contentDiv) => {
        const isHidden = contentDiv.style.display === 'none';
        contentDiv.style.display = isHidden ? 'flex' : 'none';
        const icon = headerDiv.querySelector('i');
        if(icon) {
            icon.className = isHidden ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right';
        }
    };

    const toggleTableAccordion = (headerTr, className) => {
        const rows = tableBody.querySelectorAll('.' + className);
        let currentlyHidden = true;
        if(rows.length > 0) {
            currentlyHidden = rows[0].style.display === 'none';
        }
        rows.forEach(r => {
            r.style.display = currentlyHidden ? 'table-row' : 'none';
        });
        const icon = headerTr.querySelector('i');
        if(icon) {
            icon.className = currentlyHidden ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-right';
        }
    };

    // 2. Render Responsibles List (Accordion by Team)
    responsiblesList.innerHTML = '';
    if (!state.responsaveis || state.responsaveis.length === 0) {
        responsiblesList.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem;">Nenhum responsável cadastrado.</div>';
    } else {
        const teamsToRender = [...(state.teams || []), 'Outros / Sem Equipe'];
        
        teamsToRender.forEach(team => {
            let teamResps = [];
            if (team === 'Outros / Sem Equipe') {
                teamResps = state.responsaveis.filter(r => !r.area || !state.teams.includes(r.area));
            } else {
                teamResps = state.responsaveis.filter(r => r.area === team);
            }
            
            if (teamResps.length === 0) return; // Skip empty teams
            
            // Accordion Header
            const header = document.createElement('div');
            header.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.5rem; background: rgba(255,255,255,0.05); border-radius: 4px; font-weight: 500; font-size: 0.85rem; user-select: none; border: 1px solid rgba(255,255,255,0.02); margin-top: 0.5rem;';
            header.innerHTML = `<i class="fa-solid fa-chevron-right" style="width: 15px; text-align: center;"></i> `${escapeHtml(team)}` <span style="background: rgba(255,255,255,0.1); padding: 0.1rem 0.4rem; border-radius: 10px; font-size: 0.7rem; margin-left: auto;">`${teamResps.length}`</span>`;
            
            // Container for items
            const contentContainer = document.createElement('div');
            contentContainer.style.cssText = 'display: none; flex-direction: column; gap: 0.5rem; padding-left: 0.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem;';
            
            header.addEventListener('click', () => toggleAccordion(header, contentContainer));
            
            teamResps.forEach(resp => {
                const container = document.createElement('div');
                container.className = 'resp-item-container';
                container.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem; padding: 0.5rem 0.6rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.03); background: rgba(255,255,255,0.01);';
                
                const headerRow = document.createElement('div');
                headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
                
                const nameSpan = document.createElement('span');
                nameSpan.style.cssText = 'font-size: 0.85rem; font-weight: 500; color: var(--text-primary);';
                
                const hasOverrides = resp.horasDia !== null || resp.absenteismo !== null || resp.diasUteis !== null;
                nameSpan.innerHTML = `
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600; color: var(--text-primary);">`${escapeHtml(resp.name)}`</span>
                    </div>
                    `${hasOverrides ? '<i class="fa-solid fa-user-gear" style="color: var(--color-primary); font-size: 0.75rem; margin-left: 0.25rem;" title="Parâmetros customizados ativos"></i>' : ''}`
                `;
                
                const btnGroup = document.createElement('div');
                btnGroup.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
                
                const btnConfig = document.createElement('button');
                btnConfig.className = 'btn-config-resp-item';
                btnConfig.style.cssText = 'background: transparent; border: none; color: var(--color-primary); cursor: pointer; font-size: 0.85rem; padding: 0.2rem; display: flex; align-items: center; justify-content: center;';
                btnConfig.title = 'Configurar Parâmetros de Capacidade';
                btnConfig.innerHTML = '<i class="fa-solid fa-cog"></i>';
                
                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn-delete-resp-item';
                btnDelete.setAttribute('data-permissao', 'ADMIN');
                btnDelete.style.cssText = 'background: transparent; border: none; color: var(--color-danger); cursor: pointer; font-size: 0.85rem; padding: 0.2rem; display: flex; align-items: center; justify-content: center;';
                btnDelete.title = 'Excluir Responsável';
                btnDelete.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
                
                btnGroup.appendChild(btnConfig);
                btnGroup.appendChild(btnDelete);
                headerRow.appendChild(nameSpan);
                headerRow.appendChild(btnGroup);
                container.appendChild(headerRow);
                
                btnConfig.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openCapacityModal(resp.name);
                });
                
                btnDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessário.'); return; }
                    if (confirm(`Tem certeza que deseja excluir o responsável "`${resp.name}`"? Todas as atividades sob sua responsabilidade ficarão sem responsável.`)) {
                        state.responsaveis = state.responsaveis.filter(r => r.name !== resp.name);
                        state.processes.forEach(p => {
                            if (p.responsavel === resp.name) p.responsavel = '';
                        });
                        saveState();
                        renderCadastrosView();
                        renderResponsavelFilterOptions();
                        renderTable();
                        renderBalancingTable();
                        renderReviewTable();
                    }
                });
                
                contentContainer.appendChild(container);
            });
            
            responsiblesList.appendChild(header);
            responsiblesList.appendChild(contentContainer);
        });
    }
    
    // 3. Render Activities Table (Accordion by Team)
    tableBody.innerHTML = '';
    activityCountBadge.textContent = state.processes.length;
    
    if (state.processes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    Nenhuma atividade cadastrada. Clique em "Adicionar Atividade" para iniciar.
                </td>
            </tr>
        `;
        const btnBulkDelete = document.getElementById('btn-cadastros-delete-selected');
        if (btnBulkDelete) btnBulkDelete.style.display = 'none';
        const selectAllCb = document.getElementById('cadastros-select-all');
        if (selectAllCb) selectAllCb.checked = false;
        return;
    }
    
    const activityTeamsToRender = [...(state.teams || []), 'Outros / Sem Equipe'];
    
    activityTeamsToRender.forEach((team, teamIndex) => {
        let teamProcs = [];
        if (team === 'Outros / Sem Equipe') {
            teamProcs = state.processes.filter(p => !p.area || !state.teams.includes(p.area));
        } else {
            teamProcs = state.processes.filter(p => p.area === team);
        }
        
        if (teamProcs.length === 0) return; // Skip empty groups
        
        const rowClass = 'team-activity-row-' + teamIndex;
        
        // Header Row
        const headerTr = document.createElement('tr');
        headerTr.style.cssText = 'background: rgba(255,255,255,0.03); cursor: pointer; user-select: none;';
        headerTr.innerHTML = `
            <td colspan="5" style="padding: 0.8rem; font-weight: 600; color: var(--text-primary); border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);">
                <i class="fa-solid fa-chevron-right" style="width: 20px;"></i> `${escapeHtml(team)}` <span style="background: rgba(255,255,255,0.1); color: var(--text-secondary); padding: 0.1rem 0.5rem; border-radius: 10px; font-size: 0.75rem; margin-left: 0.5rem;">`${teamProcs.length}` atividades</span>
            </td>
        `;
        headerTr.addEventListener('click', () => toggleTableAccordion(headerTr, rowClass));
        tableBody.appendChild(headerTr);
        
        // Activity Rows
        teamProcs.forEach(proc => {
            const tr = document.createElement('tr');
            tr.className = rowClass;
            tr.style.display = 'none'; // Initially collapsed
            tr.dataset.id = proc.id;
            
            const teamOptions = '<option value="">-- Sem Equipe --</option>' +
                state.teams.map(t => `
                    <option value="`${escapeHtml(t)}`" `${proc.area === t ? 'selected' : ''}`>`${escapeHtml(t)}`</option>
                `).join('');
                
            const teamResps = (state.responsaveis || []).filter(resp => {
                const rName = typeof resp === 'object' ? resp.name : resp;
                const rArea = typeof resp === 'object' ? resp.area : '';
                return !proc.area || !rArea || rArea === proc.area || proc.responsavel === rName;
            });
            const respsToDisplay = teamResps.length > 0 ? teamResps : (state.responsaveis || []);
            const respOptions = '<option value="">-- Sem Responsável --</option>' +
                respsToDisplay.map(resp => {
                    const rName = typeof resp === 'object' ? resp.name : resp;
                    return `<option value="`${escapeHtml(rName)}`" `${proc.responsavel === rName ? 'selected' : ''}`>`${escapeHtml(rName)}`</option>`;
                }).join('');
                
            tr.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" class="cadastros-row-checkbox" data-id="`${proc.id}`">
                </td>
                <td>
                    <input type="text" class="input-activity-name-cell" value="`${escapeHtml(proc.name)}`" style="width: 100%; border: none; background: transparent; color: var(--text-primary); outline: none; padding: 0.3rem 0.5rem; border-radius: 4px;">
                </td>
                <td>
                    <select class="select-activity-team-cell" style="width: 100%; border: none; background: transparent; color: var(--text-primary); outline: none; padding: 0.3rem 0.5rem; border-radius: 4px; cursor: pointer;">
                        `${teamOptions}`
                    </select>
                </td>
                <td>
                    <select class="select-activity-resp-cell" style="width: 100%; border: none; background: transparent; color: var(--text-primary); outline: none; padding: 0.3rem 0.5rem; border-radius: 4px; cursor: pointer;">
                        `${respOptions}`
                    </select>
                </td>
                <td class="col-excluir-admin" style="text-align: center;">
                    <button class="btn-row-action btn-delete-activity-cell" style="background: transparent; border: none; color: var(--color-danger); cursor: pointer; font-size: 0.95rem; padding: 0.2rem;" title="Excluir Atividade">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            
            const rowCheckbox = tr.querySelector('.cadastros-row-checkbox');
            rowCheckbox.addEventListener('change', () => {
                updateBulkDeleteState();
            });
            
            const nameInput = tr.querySelector('.input-activity-name-cell');
            nameInput.addEventListener('change', (e) => {
                const val = e.target.value.trim();
                if (val) {
                    proc.name = val;
                    saveState();
                } else {
                    e.target.value = proc.name;
                }
            });
            nameInput.addEventListener('focus', () => {
                nameInput.style.background = 'rgba(255, 255, 255, 0.08)';
                nameInput.style.border = '1px solid var(--border-color)';
            });
            nameInput.addEventListener('blur', () => {
                nameInput.style.background = 'transparent';
                nameInput.style.border = 'none';
            });
            
            const teamSelect = tr.querySelector('.select-activity-team-cell');
            teamSelect.addEventListener('change', (e) => {
                const newTeam = e.target.value;
                proc.area = newTeam;
                proc.responsavel = ''; // Reset responsible
                saveState();
                
                renderCadastrosView();
                renderAreaFilterOptions();
                renderResponsavelFilterOptions();
                renderTable();
                renderBalancingTable();
                renderReviewTable();
            });
            teamSelect.addEventListener('focus', () => {
                teamSelect.style.background = 'rgba(255, 255, 255, 0.08)';
                teamSelect.style.border = '1px solid var(--border-color)';
            });
            teamSelect.addEventListener('blur', () => {
                teamSelect.style.background = 'transparent';
                teamSelect.style.border = 'none';
            });
            
            const respSelect = tr.querySelector('.select-activity-resp-cell');
            respSelect.addEventListener('change', (e) => {
                proc.responsavel = e.target.value;
                saveState();
                renderResponsavelFilterOptions();
                renderTable();
                renderBalancingTable();
                renderReviewTable();
            });
            respSelect.addEventListener('focus', () => {
                respSelect.style.background = 'rgba(255, 255, 255, 0.08)';
                respSelect.style.border = '1px solid var(--border-color)';
            });
            respSelect.addEventListener('blur', () => {
                respSelect.style.background = 'transparent';
                respSelect.style.border = 'none';
            });
            
            const deleteBtn = tr.querySelector('.btn-delete-activity-cell');
            deleteBtn.addEventListener('click', () => {
                if (!verificarPermissao('ADMIN')) { alert('Acesso negado: Perfil ADMIN necessário.'); return; }
                if (confirm(`Deseja realmente excluir a atividade "`${proc.name}`"?`)) {
                    state.processes = state.processes.filter(p => p.id !== proc.id);
                    saveState();
                    renderCadastrosView();
                    renderTable();
                    renderBalancingTable();
                    renderReviewTable();
                }
            });
            
            tableBody.appendChild(tr);
        });
    });
    
    updateBulkDeleteState();
    
    // Check permission logic again after recreating elements
    const perfil = document.getElementById('select-user-profile')?.value || 'ADMIN';
    document.querySelectorAll('[data-permissao]').forEach(el => {
        const permitidos = el.getAttribute('data-permissao').split(',').map(s => s.trim());
        if (permitidos.includes(perfil)) {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });
}
"@

Set-Content -Path $file -Value ($before + $newFunction + $after) -Encoding UTF8
Write-Host "Patched successfully!"
