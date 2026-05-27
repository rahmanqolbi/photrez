pub fn init_core() -> &'static str {
    "Photrez Core Initialized"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init() {
        assert_eq!(init_core(), "Photrez Core Initialized");
    }
}
