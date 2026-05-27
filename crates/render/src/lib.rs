pub fn init_render() -> &'static str {
    "Photrez Renderer Initialized"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_init() {
        assert_eq!(init_render(), "Photrez Renderer Initialized");
    }
}
