from datetime import datetime, timezone, timedelta
from typing import Any
import secrets
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, get_db
from app.core import security, config
from app.models import users as models
from app.models import tokens
from app.schemas import users as schemas

router = APIRouter()

@router.post("/login", response_model=schemas.Token)
def login_access_token(
    db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password"
        )
    if not security.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")

    # Generate Access Token
    access_token_expires = timedelta(minutes=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    user_role = user.role.role_name if user.role else "student"
    access_token = security.create_access_token(
        user.user_id, role=user_role, expires_delta=access_token_expires
    )
    
    # Generate Refresh Token
    refresh_token = secrets.token_urlsafe(32)
    refresh_expires_at = datetime.now(timezone.utc) + timedelta(days=config.settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    db_refresh_token = tokens.RefreshToken(
        user_id=user.user_id,
        token=refresh_token,
        expires_at=refresh_expires_at
    )
    db.add(db_refresh_token)
    db.commit()


    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role.role_name if user.role else "student"
    }

@router.post("/refresh", response_model=schemas.Token)
def refresh_token(
    refresh_token: str = Body(..., embed=True),
    db: Session = Depends(get_db)
) -> Any:
    """
    Refresh access token using refresh token
    """
    # Look up refresh token
    db_token = db.query(tokens.RefreshToken).filter(
        tokens.RefreshToken.token == refresh_token
    ).first()
    
    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Check if revoked or expired
    if db_token.revoked:
        raise HTTPException(status_code=401, detail="Token revoked")
        
    # Handle both timezone-aware and naive datetimes from the database
    expires_at = db_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Token expired")
        
    # Get user
    user = db.query(models.User).filter(models.User.user_id == db_token.user_id).first()
    if not user:
         raise HTTPException(status_code=401, detail="User not found")
         
    # Generate New Access Token
    access_token_expires = timedelta(minutes=config.settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.user_id, expires_delta=access_token_expires
    )
    
    # Optional: Rotate Refresh Token (Create new one, revoke old one)
    # For now, just return new access token and keep refresh token (or implement rotation if strict)
    # Let's keep existing refresh token valid until expiry for simpler UX unless requested otherwise.
    # To return same structure, we return the same refresh token.
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role.role_name if user.role else "student"
    }
