from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from .database import Base

class CheckHistory(Base):
    __tablename__ = "checks"

    id = Column(Integer, primary_key=True, index=True)
    claim = Column(String, nullable=False)
    risk_level = Column(String, nullable=False)
    explanation = Column(Text, nullable=True)
    source = Column(String, nullable=True)
    language = Column(String, default="en")
    timestamp = Column(DateTime, default=datetime.utcnow)
