from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends, status
from auth import db, get_current_user, User, PermissionChecker

router = APIRouter(prefix="/roles", tags=["admin"])

class Permission(BaseModel):
    name: str = Field(..., description="Unique name of the permission, e.g., 'user_create'")
    description: Optional[str] = Field(None, description="Description of what the permission allows")

class Role(BaseModel):
    name: str = Field(..., description="Unique name of the role, e.g., 'Administrator'")
    permissions: List[str] = Field(default_factory=list, description="List of permission names associated with this role")

class RoleCreate(BaseModel):
    name: str
    permissions: List[str] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    permissions: Optional[List[str]] = None

class PermissionCreate(BaseModel):
    name: str
    description: Optional[str] = None

@router.get("/permissions", response_model=List[Permission])
async def list_permissions(_ = Depends(PermissionChecker("user_manage"))):
    perms = await db.permissions.find().to_list(length=100)
    return [Permission(**{k: v for k, v in p.items() if k != "_id"}) for p in perms]


@router.post("/permissions", status_code=status.HTTP_201_CREATED)
async def create_permission(req: PermissionCreate, _ = Depends(PermissionChecker("user_manage"))):
    if await db.permissions.find_one({"name": req.name}):
        raise HTTPException(status_code=400, detail="Permission already exists")
    await db.permissions.insert_one(req.model_dump())
    return {"success": True, "message": f"Permission {req.name} created"}


@router.delete("/permissions/{name}")
async def delete_permission(name: str, _ = Depends(PermissionChecker("user_manage"))):
    # Prevent deleting permissions that are actively assigned to roles
    role_count = await db.roles.count_documents({"permissions": name})
    if role_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete permission '{name}' because it is assigned to {role_count} role(s)"
        )
    result = await db.permissions.delete_one({"name": name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Permission not found")
    return {"success": True, "message": f"Permission {name} deleted"}

@router.get("", response_model=List[Role])
async def list_roles(_ = Depends(PermissionChecker("user_manage"))):
    roles = await db.roles.find().to_list(length=100)
    return [Role(**{k: v for k, v in r.items() if k != "_id"}) for r in roles]

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_role(req: RoleCreate, _ = Depends(PermissionChecker("user_manage"))):
    if await db.roles.find_one({"name": req.name}):
        raise HTTPException(status_code=400, detail="Role already exists")
    
    # Verify all provided permissions exist
    if req.permissions:
        perms = await db.permissions.find({"name": {"$in": req.permissions}}).to_list(length=len(req.permissions))
        if len(perms) != len(req.permissions):
            raise HTTPException(status_code=400, detail="One or more permissions do not exist")
        
    await db.roles.insert_one(req.model_dump())
    return {"success": True, "message": f"Role {req.name} created"}

@router.patch("/{name}")
async def update_role(name: str, req: RoleUpdate, _ = Depends(PermissionChecker("user_manage"))):
    update_data = {}
    if req.name is not None: update_data["name"] = req.name
    if req.permissions is not None:
        if req.permissions:
            perms = await db.permissions.find({"name": {"$in": req.permissions}}).to_list(length=len(req.permissions))
            if len(perms) != len(req.permissions):
                raise HTTPException(status_code=400, detail="One or more permissions do not exist")
        update_data["permissions"] = req.permissions
        
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    # Check the role actually exists first
    if not await db.roles.find_one({"name": name}):
        raise HTTPException(status_code=404, detail="Role not found")

    await db.roles.update_one({"name": name}, {"$set": update_data})
    
    # If the role was renamed, cascade the rename to all users that have this role
    if req.name and req.name != name:
        await db.users.update_many({"role": name}, {"$set": {"role": req.name}})
    
    return {"success": True, "message": f"Role {name} updated"}

@router.delete("/{name}")
async def delete_role(name: str, _ = Depends(PermissionChecker("user_manage"))):
    # Prevent deleting roles that are assigned to users
    user_count = await db.users.count_documents({"role": name})
    if user_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete role {name} because it is assigned to {user_count} users")
        
    result = await db.roles.delete_one({"name": name})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Role not found")
    return {"success": True, "message": f"Role {name} deleted"}
