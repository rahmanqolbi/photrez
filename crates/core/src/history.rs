// SPDX-License-Identifier: AGPL-3.0-or-later
use crate::document::Document;

pub struct HistoryStore {
    past: Vec<Document>,
    future: Vec<Document>,
    limit: usize,
}

impl HistoryStore {
    pub fn new(limit: usize) -> Self {
        Self {
            past: Vec::new(),
            future: Vec::new(),
            limit,
        }
    }

    pub fn commit(&mut self, state: Document) {
        self.past.push(state);
        if self.past.len() > self.limit {
            self.past.remove(0);
        }
        self.future.clear();
    }

    pub fn undo(&mut self, current: Document) -> Option<Document> {
        let prev = self.past.pop()?;
        self.future.push(current);
        if self.future.len() > self.limit {
            self.future.remove(0);
        }
        Some(prev)
    }

    pub fn redo(&mut self, current: Document) -> Option<Document> {
        let next = self.future.pop()?;
        self.past.push(current);
        if self.past.len() > self.limit {
            self.past.remove(0);
        }
        Some(next)
    }

    pub fn clear(&mut self) {
        self.past.clear();
        self.future.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_history_undo_redo() {
        let mut history = HistoryStore::new(3);
        let s1 = Document::new("s1".to_string(), 100, 100);
        let s2 = Document::new("s2".to_string(), 100, 100);
        let s3 = Document::new("s3".to_string(), 100, 100);

        history.commit(s1.clone());
        history.commit(s2.clone());

        // Undo from s3
        let undone = history.undo(s3.clone());
        assert!(undone.is_some());
        assert_eq!(undone.unwrap().id, "s2");

        // Redo to s3
        let redone = history.redo(s2.clone());
        assert!(redone.is_some());
        assert_eq!(redone.unwrap().id, "s3");
    }

    #[test]
    fn test_history_limit() {
        let mut history = HistoryStore::new(2);
        let s1 = Document::new("s1".to_string(), 100, 100);
        let s2 = Document::new("s2".to_string(), 100, 100);
        let s3 = Document::new("s3".to_string(), 100, 100);

        history.commit(s1);
        history.commit(s2);
        history.commit(s3); // s1 should be discarded

        assert_eq!(history.past.len(), 2);
        assert_eq!(history.past[0].id, "s2");
        assert_eq!(history.past[1].id, "s3");
    }

    #[test]
    fn test_history_undo_empty() {
        let mut history = HistoryStore::new(5);
        let current = Document::new("current".to_string(), 100, 100);
        let result = history.undo(current);
        assert!(result.is_none());
    }

    #[test]
    fn test_history_redo_empty() {
        let mut history = HistoryStore::new(5);
        let current = Document::new("current".to_string(), 100, 100);
        let result = history.redo(current);
        assert!(result.is_none());
    }

    #[test]
    fn test_history_clear() {
        let mut history = HistoryStore::new(5);
        let s1 = Document::new("s1".to_string(), 100, 100);
        let s2 = Document::new("s2".to_string(), 100, 100);
        history.commit(s1);
        history.commit(s2);

        history.clear();
        assert!(history.past.is_empty());
        assert!(history.future.is_empty());
    }

    #[test]
    fn test_history_redo_discarded_on_new_commit() {
        let mut history = HistoryStore::new(5);
        let s1 = Document::new("s1".to_string(), 100, 100);
        let s2 = Document::new("s2".to_string(), 100, 100);
        let s3 = Document::new("s3".to_string(), 100, 100);

        history.commit(s1);
        history.commit(s2);
        history.undo(s3.clone());

        // Redo branch exists
        assert!(!history.future.is_empty());

        // New commit discards redo branch
        history.commit(s3);
        assert!(history.future.is_empty());
    }
}
