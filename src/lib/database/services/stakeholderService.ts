import { supabase, isSupabaseConfigured } from '../../supabase'
import type { Stakeholder } from '../../supabase'

export const getStakeholders = async (): Promise<Stakeholder[]> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_stakeholders')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  try {
    const { data, error } = await supabase
      .from('stakeholders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching stakeholders:', error)
    return []
  }
}

export const getStakeholderByShortId = async (shortId: number): Promise<Stakeholder | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stored = localStorage.getItem('kyp_stakeholders')
      const stakeholders = stored ? JSON.parse(stored) : []
      return stakeholders.find((stakeholder: Stakeholder) => stakeholder.short_id === shortId) || null
    } catch {
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('stakeholders')
      .select('*')
      .eq('short_id', shortId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching stakeholder by short ID:', error)
    return null
  }
}

export const createStakeholder = async (
  name: string, 
  visitorId?: string, 
  userRoleId?: string, 
  lawFirmId?: string, 
  userPermissionId?: string,
  department?: string,
  pendoRole?: string
): Promise<Stakeholder | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      // Check for duplicate if both visitorId and lawFirmId are provided
      if (visitorId && lawFirmId) {
        const stakeholders = JSON.parse(localStorage.getItem('kyp_stakeholders') || '[]')
        const existingStakeholder = stakeholders.find((s: Stakeholder) => 
          s.visitor_id === visitorId && s.law_firm_id === lawFirmId
        )
        if (existingStakeholder) {
          return existingStakeholder
        }
      }
      
      const stakeholders = JSON.parse(localStorage.getItem('kyp_stakeholders') || '[]')
      const nextShortId = Math.max(0, ...stakeholders.map((s: Stakeholder) => s.short_id || 0)) + 1
      const newStakeholder: Stakeholder = {
        id: `stakeholder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        workspace_id: 'default-workspace',
        name,
        user_role_id: userRoleId || null,
        law_firm_id: lawFirmId || null,
        user_permission_id: userPermissionId || null,
        visitor_id: visitorId || null,
        department: department || null,
        pendo_role: pendoRole || null,
        short_id: nextShortId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      stakeholders.unshift(newStakeholder)
      localStorage.setItem('kyp_stakeholders', JSON.stringify(stakeholders))
      return newStakeholder
    } catch (error) {
      console.error('Error creating stakeholder locally:', error)
      return null
    }
  }

  try {
    // Check for duplicate if both visitorId and lawFirmId are provided
    if (visitorId && lawFirmId) {
      const { data: existingStakeholder, error: checkError } = await supabase
        .from('stakeholders')
        .select('*')
        .eq('visitor_id', visitorId)
        .eq('law_firm_id', lawFirmId)
        .maybeSingle()
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking for duplicate stakeholder:', checkError)
      }
      
      if (existingStakeholder) {
        return existingStakeholder
      }
    }
    
    // Get the workspace (assuming single workspace for now)
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1)
      .single()

    const { data, error } = await supabase
      .from('stakeholders')
      .insert([{
        workspace_id: workspaces?.id || null,
        name,
        visitor_id: visitorId || null,
        user_role_id: userRoleId || null,
        law_firm_id: lawFirmId || null,
        user_permission_id: userPermissionId || null,
        department: department || null,
        pendo_role: pendoRole || null
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating stakeholder:', error)
    return null
  }
}

export const updateStakeholder = async (
  stakeholderId: string, 
  updates: { name?: string; user_role_id?: string; law_firm_id?: string; user_permission_id?: string; notes?: string; visitor_id?: string; department?: string; pendo_role?: string }
): Promise<Stakeholder | null> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stakeholders = JSON.parse(localStorage.getItem('kyp_stakeholders') || '[]')
      const updatedStakeholders = stakeholders.map((stakeholder: Stakeholder) => 
        stakeholder.id === stakeholderId 
          ? { ...stakeholder, ...updates, updated_at: new Date().toISOString() }
          : stakeholder
      )
      localStorage.setItem('kyp_stakeholders', JSON.stringify(updatedStakeholders))
      
      const updatedStakeholder = updatedStakeholders.find((s: Stakeholder) => s.id === stakeholderId)
      return updatedStakeholder || null
    } catch (error) {
      console.error('Error updating stakeholder locally:', error)
      return null
    }
  }

  try {
    const { data, error } = await supabase
      .from('stakeholders')
      .update(updates)
      .eq('id', stakeholderId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating stakeholder:', error)
    return null
  }
}

export const deleteStakeholder = async (stakeholderId: string): Promise<boolean> => {
  if (!isSupabaseConfigured || !supabase) {
    // Local storage fallback
    try {
      const stakeholders = JSON.parse(localStorage.getItem('kyp_stakeholders') || '[]')
      const filteredStakeholders = stakeholders.filter((stakeholder: Stakeholder) => stakeholder.id !== stakeholderId)
      localStorage.setItem('kyp_stakeholders', JSON.stringify(filteredStakeholders))
      return true
    } catch (error) {
      console.error('Error deleting stakeholder locally:', error)
      return false
    }
  }

  try {
    const { error } = await supabase
      .from('stakeholders')
      .delete()
      .eq('id', stakeholderId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting stakeholder:', error)
    return false
  }
}

export const importStakeholdersFromCSV = async (csvData: string): Promise<{ success: number, errors: string[] }> => {
  const results = { success: 0, errors: [] as string[] }
  
  try {
    // Get permission IDs for Administrator and General User
    let adminPermissionId: string | null = null
    let generalUserPermissionId: string | null = null
    
    if (!isSupabaseConfigured || !supabase) {
      // Local storage fallback
      try {
        const userPermissions = JSON.parse(localStorage.getItem('kyp_user_permissions') || '[]')
        const adminPermission = userPermissions.find((p: any) => p.name === 'Administrator')
        const generalPermission = userPermissions.find((p: any) => p.name === 'General User')
        adminPermissionId = adminPermission?.id || null
        generalUserPermissionId = generalPermission?.id || null
      } catch (error) {
        console.error('Error loading user permissions from localStorage:', error)
      }
    } else {
      // Supabase implementation
      try {
        const { data: permissions } = await supabase
          .from('user_permissions')
          .select('id, name')
          .in('name', ['Administrator', 'General User'])
        
        if (permissions) {
          const adminPermission = permissions.find(p => p.name === 'Administrator')
          const generalPermission = permissions.find(p => p.name === 'General User')
          adminPermissionId = adminPermission?.id || null
          generalUserPermissionId = generalPermission?.id || null
        }
      } catch (error) {
        console.error('Error loading user permissions from Supabase:', error)
      }
    }
    
    const lines = csvData.trim().split('\n')
    const headers = lines[0]?.split(',').map(h => h.trim())
    
    if (!headers || headers.length < 8) {
      results.errors.push('CSV must have at least 8 columns: Visitor ID, Law Firm ID, Name, Department, Pendo Role, Law Firm Name, User Role, User Permission')
      return results
    }
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim())
        
        if (values.length < 8) {
          results.errors.push(`Row ${i + 1}: Insufficient columns`)
          continue
        }
        
        const [visitorId, lawFirmId, name, department, pendoRole, lawFirmName, userRoleName, userPermissionValue] = values
        
        if (!name) {
          results.errors.push(`Row ${i + 1}: Name is required`)
          continue
        }
        
        // Find or create law firm
        let lawFirmDbId = null
        if (lawFirmName) {
          if (!isSupabaseConfigured || !supabase) {
            // Local storage fallback
            const lawFirms = JSON.parse(localStorage.getItem('kyp_law_firms') || '[]')
            let lawFirm = lawFirms.find((lf: any) => lf.name === lawFirmName)
            
            if (!lawFirm) {
              lawFirm = {
                id: `lf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                workspace_id: 'default-workspace',
                name: lawFirmName,
                structure: 'decentralised',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
              lawFirms.push(lawFirm)
              localStorage.setItem('kyp_law_firms', JSON.stringify(lawFirms))
            }
            
            lawFirmDbId = lawFirm.id
          } else {
            // Supabase implementation
            let { data: lawFirm } = await supabase
              .from('law_firms')
              .select('id')
              .eq('name', lawFirmName)
              .limit(1)
              .maybeSingle()
            
            if (!lawFirm) {
              const { data: newLawFirm } = await supabase
                .from('law_firms')
                .insert([{
                  name: lawFirmName,
                  structure: 'decentralised',
                  status: 'active'
                }])
                .select('id')
                .maybeSingle()
              
              lawFirm = newLawFirm
            }
            
            lawFirmDbId = lawFirm?.id
          }
        }
        
        // Find or create user role
        let userRoleDbId = null
        if (userRoleName && userRoleName.trim()) {
          if (!isSupabaseConfigured || !supabase) {
            // Local storage fallback
            const userRoles = JSON.parse(localStorage.getItem('kyp_user_roles') || '[]')
            let userRole = userRoles.find((ur: any) => ur.name === userRoleName)
            
            if (!userRole) {
              userRole = {
                id: `ur-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                workspace_id: 'default-workspace',
                name: userRoleName,
                colour: '#3B82F6',
                icon: 'Person',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
              userRoles.push(userRole)
              localStorage.setItem('kyp_user_roles', JSON.stringify(userRoles))
            }
            
            userRoleDbId = userRole.id
          } else {
            // Supabase implementation
            let { data: userRole } = await supabase
              .from('user_roles')
              .select('id')
              .eq('name', userRoleName)
              .single()
            
            if (!userRole) {
              const { data: newUserRole } = await supabase
                .from('user_roles')
                .insert([{
                  name: userRoleName,
                  colour: '#3B82F6',
                  icon: 'Person'
                }])
                .select('id')
                .single()
              
              userRole = newUserRole
            }
            
            userRoleDbId = userRole?.id
          }
        }
        
        // Determine user permission ID based on userPermissionValue
        let userPermissionDbId = null
        if (userPermissionValue && userPermissionValue.trim()) {
          const permissionValueLower = userPermissionValue.toLowerCase()
          if (permissionValueLower === 'true') {
            userPermissionDbId = adminPermissionId
          } else if (permissionValueLower === 'false') {
            userPermissionDbId = generalUserPermissionId
          }
          // If value is neither 'true' nor 'false', userPermissionDbId remains null
        }
        
        // Create stakeholder
        const stakeholder = await createStakeholder(name, visitorId, userRoleDbId, lawFirmDbId, userPermissionDbId)
        
        if (stakeholder) {
          // Check if we need to update user role for existing stakeholder
          if (userRoleDbId && stakeholder.user_role_id !== userRoleDbId) {
            try {
              const updatedStakeholder = await updateStakeholder(stakeholder.id, {
                user_role_id: userRoleDbId
              })
              if (!updatedStakeholder) {
                results.errors.push(`Row ${i + 1}: Failed to update user role for existing stakeholder`)
              }
            } catch (updateError) {
              results.errors.push(`Row ${i + 1}: Error updating user role - ${updateError instanceof Error ? updateError.message : 'Unknown error'}`)
            }
          }
          
          // Check if we need to update user permission for existing stakeholder
          if (userPermissionDbId && stakeholder.user_permission_id !== userPermissionDbId) {
            try {
              const updatedStakeholder = await updateStakeholder(stakeholder.id, {
                user_permission_id: userPermissionDbId
              })
              if (!updatedStakeholder) {
                results.errors.push(`Row ${i + 1}: Failed to update user permission for existing stakeholder`)
              }
            } catch (updateError) {
              results.errors.push(`Row ${i + 1}: Error updating user permission - ${updateError instanceof Error ? updateError.message : 'Unknown error'}`)
            }
          }
          
          // Update additional fields if using Supabase
          if (isSupabaseConfigured && supabase && (visitorId || department || pendoRole)) {
            await supabase
              .from('stakeholders')
              .update({
                visitor_id: visitorId || null,
                department: department || null,
                pendo_role: pendoRole || null
              })
              .eq('id', stakeholder.id)
          } else if (!isSupabaseConfigured) {
            // Update local storage with additional fields
            const stakeholders = JSON.parse(localStorage.getItem('kyp_stakeholders') || '[]')
            const updatedStakeholders = stakeholders.map((s: Stakeholder) => 
              s.id === stakeholder.id 
                ? { 
                    ...s, 
                    visitor_id: visitorId || null,
                    department: department || null,
                    pendo_role: pendoRole || null
                  }
                : s
            )
            localStorage.setItem('kyp_stakeholders', JSON.stringify(updatedStakeholders))
          }
          
          results.success++
        } else {
          results.errors.push(`Row ${i + 1}: Failed to create stakeholder`)
        }
        
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
  } catch (error) {
    results.errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  
  return results
}